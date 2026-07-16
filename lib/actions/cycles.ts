"use server"
import { requireOrgAction } from "@/lib/auth"
import { db } from "@/lib/db"
import { addDays, subtractDays } from "@/lib/dates/uk-bank-holidays"
import { revalidatePath } from "next/cache"
import type { DayType } from "@/lib/generated/prisma/client"
import { toSafeErrorMessage } from "@/lib/prisma-error"

export async function markCyclePaid(cycleId: string) {
  try {
    const { org, userId } = await requireOrgAction({ minRole: "COMMERCIAL" })

    const cycle = await db.paymentCycle.findFirst({
      where: {
        id: cycleId,
        status: { in: ["NOTICE_SERVED", "PAY_LESS_SERVED"] },
        paymentSchedule: { subcontractOrder: { organisationId: org.id } },
      },
      include: {
        assessment: true,
        paymentSchedule: { include: { subcontractOrder: true } },
      },
    })
    if (!cycle) throw new Error("Cycle not found or not in a payable status")

    const retentionAmount = cycle.assessment ? Number(cycle.assessment.retentionAmount) : 0

    await Promise.all([
      db.paymentCycle.update({
        where: { id: cycleId },
        data: { status: "PAID" },
      }),
      // Lock the assessment so it can't be edited after payment
      cycle.assessment
        ? db.assessment.update({
            where: { id: cycle.assessment.id },
            data: { isLocked: true },
          })
        : Promise.resolve(),
      // Increment retention ledger by this cycle's assessed retention
      retentionAmount > 0
        ? db.retentionLedger.updateMany({
            where: { subcontractOrderId: cycle.paymentSchedule.subcontractOrder.id },
            data: { totalHeld: { increment: retentionAmount } },
          })
        : Promise.resolve(),
    ])

    const order = cycle.paymentSchedule.subcontractOrder
    await db.auditEvent.create({
      data: {
        organisationId: org.id,
        subcontractOrderId: order.id,
        paymentCycleId: cycleId,
        userId,
        eventType: "cycle.marked_paid",
        payload: { retentionAdded: retentionAmount },
      },
    })

    revalidatePath(`/cycles/${cycleId}`)
    revalidatePath(`/subcontracts/${order.id}`)
  } catch (error) {
    throw new Error(toSafeErrorMessage(error))
  }
}

export async function setMilestoneApplicationDate(cycleId: string, applicationDateStr: string) {
  try {
    const { org, userId } = await requireOrgAction({ minRole: "COMMERCIAL" })

    const cycle = await db.paymentCycle.findFirst({
      where: {
        id: cycleId,
        status: "AWAITING_APPLICATION",
        paymentSchedule: {
          appDueDateRule: "MILESTONE",
          subcontractOrder: { organisationId: org.id },
        },
      },
      include: {
        paymentSchedule: { include: { subcontractOrder: true } },
      },
    })
    if (!cycle) throw new Error("Cycle not found or not a milestone cycle awaiting application")

    const appDate = new Date(applicationDateStr)
    const schedule = cycle.paymentSchedule

    const dueDate = addDays(appDate, schedule.dueDateOffsetDays, schedule.dueDateOffsetType as DayType)
    const paymentNoticeDeadline = addDays(dueDate, schedule.paymentNoticeDeadlineDays, schedule.paymentNoticeDeadlineType as DayType)
    const finalDateForPayment = addDays(dueDate, schedule.finalDateOffsetDays, schedule.finalDateOffsetType as DayType)
    const payLessDeadline = subtractDays(finalDateForPayment, schedule.payLessDeadlineDays, schedule.payLessDeadlineType as DayType)

    await db.paymentCycle.update({
      where: { id: cycleId },
      data: { applicationExpectedDate: appDate, dueDate, paymentNoticeDeadline, finalDateForPayment, payLessDeadline },
    })

    await db.auditEvent.create({
      data: {
        organisationId: org.id,
        subcontractOrderId: schedule.subcontractOrder.id,
        paymentCycleId: cycleId,
        userId,
        eventType: "cycle.milestone_date_set",
        payload: { applicationExpectedDate: appDate.toISOString() },
      },
    })

    revalidatePath(`/cycles/${cycleId}`)
  } catch (error) {
    throw new Error(toSafeErrorMessage(error))
  }
}

export async function closeCycle(cycleId: string, reason: string) {
  try {
    const { org, userId } = await requireOrgAction({ minRole: "COMMERCIAL" })

    const cycle = await db.paymentCycle.findFirst({
      where: {
        id: cycleId,
        status: { notIn: ["PAID", "CLOSED"] },
        paymentSchedule: { subcontractOrder: { organisationId: org.id } },
      },
      include: {
        assessment: true,
        paymentSchedule: { include: { subcontractOrder: true } },
      },
    })
    if (!cycle) throw new Error("Cycle not found or already closed")

    await db.paymentCycle.update({
      where: { id: cycleId },
      data: { status: "CLOSED" },
    })

    if (cycle.assessment) {
      await db.assessment.update({
        where: { id: cycle.assessment.id },
        data: { isLocked: true },
      })
    }

    const order = cycle.paymentSchedule.subcontractOrder
    await db.auditEvent.create({
      data: {
        organisationId: org.id,
        subcontractOrderId: order.id,
        paymentCycleId: cycleId,
        userId,
        eventType: "cycle.closed",
        payload: { reason },
      },
    })

    revalidatePath(`/cycles/${cycleId}`)
    revalidatePath(`/subcontracts/${order.id}`)
  } catch (error) {
    throw new Error(toSafeErrorMessage(error))
  }
}
