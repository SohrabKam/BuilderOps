import { db } from "./db"
import { CycleStatus } from "./generated/prisma/client"
import { differenceInCalendarDays } from "date-fns"

export type PortfolioStats = {
  activeContracts: number
  totalContractValue: number
  totalRetentionHeld: number
  livePaymentCycles: number
  totalOutstanding: number
}

export async function getPortfolioStats(organisationId: string): Promise<PortfolioStats> {
  const [orders, retentionRows, liveCount, outstandingNotices] = await Promise.all([
    db.subcontractOrder.findMany({
      where: { organisationId, isActive: true },
      select: {
        contractSum: true,
        variations: { where: { status: "AGREED" }, select: { agreedValue: true } },
      },
    }),
    db.retentionLedger.findMany({
      where: { subcontractOrder: { organisationId, isActive: true } },
      select: { totalHeld: true },
    }),
    db.paymentCycle.count({
      where: {
        status: { in: ["APPLICATION_RECEIVED", "UNDER_ASSESSMENT", "NOTICE_SERVED", "PAY_LESS_SERVED"] },
        paymentSchedule: { subcontractOrder: { organisationId, isActive: true } },
      },
    }),
    // Sum all served-but-unpaid notices (prefer payless over payment for the same cycle)
    db.paymentCycle.findMany({
      where: {
        status: { in: ["NOTICE_SERVED", "PAY_LESS_SERVED"] },
        paymentSchedule: { subcontractOrder: { organisationId, isActive: true } },
      },
      select: {
        status: true,
        paymentNotice: { select: { sumDue: true, status: true } },
        payLessNotice: { select: { sumDue: true, status: true } },
      },
    }),
  ])

  const totalOutstanding = outstandingNotices.reduce((sum, c) => {
    const notice = c.payLessNotice?.status === "SERVED" ? c.payLessNotice : c.paymentNotice
    return sum + (notice?.sumDue ? Number(notice.sumDue) : 0)
  }, 0)

  return {
    activeContracts: orders.length,
    totalContractValue: orders.reduce((s, o) => {
      const variationsTotal = o.variations.reduce((vs, v) => vs + (v.agreedValue ? Number(v.agreedValue) : 0), 0)
      return s + Number(o.contractSum) + variationsTotal
    }, 0),
    totalRetentionHeld: retentionRows.reduce((s, r) => s + Number(r.totalHeld), 0),
    livePaymentCycles: liveCount,
    totalOutstanding,
  }
}

export type RecentlyPaidCycle = {
  id: string
  cycleNumber: number
  subcontractorName: string
  projectName: string
  subcontractRef: string
  sumDue: number | null
  paidAt: Date | null
}

export async function getRecentlyPaidCycles(organisationId: string): Promise<RecentlyPaidCycle[]> {
  const since = new Date(Date.now() - 90 * 86_400_000)

  const cycles = await db.paymentCycle.findMany({
    where: {
      status: "PAID",
      updatedAt: { gte: since },
      paymentSchedule: {
        subcontractOrder: { organisationId, isActive: true },
      },
    },
    include: {
      paymentSchedule: {
        include: {
          subcontractOrder: {
            include: {
              project: { select: { name: true } },
              subcontractor: { select: { name: true } },
            },
          },
        },
      },
      paymentNotice: { select: { sumDue: true, servedAt: true } },
      payLessNotice: { select: { sumDue: true, servedAt: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  })

  return cycles.map((c) => {
    const order = c.paymentSchedule.subcontractOrder
    const notice = c.payLessNotice ?? c.paymentNotice
    return {
      id: c.id,
      cycleNumber: c.cycleNumber,
      subcontractorName: order.subcontractor.name,
      projectName: order.project.name,
      subcontractRef: order.reference,
      sumDue: notice?.sumDue ? Number(notice.sumDue) : null,
      paidAt: c.updatedAt,
    }
  })
}

export type RAGStatus = "green" | "amber" | "red" | "breached"

export function getRagStatus(deadline: Date, now = new Date()): RAGStatus {
  const days = differenceInCalendarDays(deadline, now)
  if (days < 0) return "breached"
  if (days <= 2) return "red"
  if (days <= 5) return "amber"
  return "green"
}

export type DashboardCycle = {
  id: string
  cycleNumber: number
  subcontractId: string
  subcontractRef: string
  subcontractorName: string
  projectName: string
  nextDeadlineLabel: string
  nextDeadlineDate: Date
  rag: RAGStatus
  status: CycleStatus
  daysUntilDeadline: number
  paymentNoticeDeadline: Date
  payLessDeadline: Date
  finalDateForPayment: Date
  dueDate: Date
  applicationExpectedDate: Date
  dateDerivation: Record<string, string>
}

export async function getDashboardCycles(organisationId: string): Promise<DashboardCycle[]> {
  const now = new Date()
  // Look-ahead window: show AWAITING_APPLICATION cycles due within 45 days.
  // This prevents all pre-generated future cycles from flooding the dashboard.
  const lookahead = new Date(now.getTime() + 45 * 86_400_000)

  const [awaitingCycles, activeCycles] = await Promise.all([
    db.paymentCycle.findMany({
      where: {
        status: "AWAITING_APPLICATION",
        applicationExpectedDate: { lte: lookahead },
        paymentSchedule: {
          subcontractOrder: { organisationId, isActive: true },
        },
      },
      include: {
        paymentSchedule: {
          include: {
            subcontractOrder: {
              include: {
                project: { select: { name: true } },
                subcontractor: { select: { name: true } },
              },
            },
          },
        },
        application: { select: { dateReceived: true } },
        paymentNotice: { select: { status: true, servedAt: true } },
        payLessNotice: { select: { status: true, servedAt: true } },
      },
    }),
    db.paymentCycle.findMany({
      where: {
        status: { in: ["APPLICATION_RECEIVED", "UNDER_ASSESSMENT", "NOTICE_SERVED", "PAY_LESS_SERVED"] },
        paymentSchedule: {
          subcontractOrder: { organisationId, isActive: true },
        },
      },
      include: {
        paymentSchedule: {
          include: {
            subcontractOrder: {
              include: {
                project: { select: { name: true } },
                subcontractor: { select: { name: true } },
              },
            },
          },
        },
        application: { select: { dateReceived: true } },
        paymentNotice: { select: { status: true, servedAt: true } },
        payLessNotice: { select: { status: true, servedAt: true } },
      },
    }),
  ])

  // For AWAITING_APPLICATION, keep only the earliest cycle per payment schedule
  // (in case multiple fall within the look-ahead window at contract start)
  const seenSchedules = new Set<string>()
  const filteredAwaiting = awaitingCycles
    .sort((a, b) => a.cycleNumber - b.cycleNumber)
    .filter((c) => {
      if (seenSchedules.has(c.paymentScheduleId)) return false
      seenSchedules.add(c.paymentScheduleId)
      return true
    })

  const cycles = [...activeCycles, ...filteredAwaiting]

  return cycles.map((cycle) => {
    const order = cycle.paymentSchedule.subcontractOrder

    // Determine the next actionable deadline
    let nextDeadlineLabel = "Payment notice deadline"
    let nextDeadlineDate = cycle.paymentNoticeDeadline

    if (cycle.status === "PAY_LESS_SERVED") {
      nextDeadlineLabel = "Final date for payment"
      nextDeadlineDate = cycle.finalDateForPayment
    } else if (
      cycle.status === "NOTICE_SERVED" &&
      (!cycle.payLessNotice || cycle.payLessNotice.status !== "SERVED")
    ) {
      nextDeadlineLabel = "Pay-less deadline"
      nextDeadlineDate = cycle.payLessDeadline
    } else if (
      cycle.status === "AWAITING_APPLICATION" ||
      cycle.status === "APPLICATION_RECEIVED" ||
      cycle.status === "UNDER_ASSESSMENT"
    ) {
      nextDeadlineLabel = "Payment notice deadline"
      nextDeadlineDate = cycle.paymentNoticeDeadline
    }

    const daysUntil = differenceInCalendarDays(nextDeadlineDate, now)
    const rag = getRagStatus(nextDeadlineDate, now)

    return {
      id: cycle.id,
      cycleNumber: cycle.cycleNumber,
      subcontractId: order.id,
      subcontractRef: order.reference,
      subcontractorName: order.subcontractor.name,
      projectName: order.project.name,
      nextDeadlineLabel,
      nextDeadlineDate,
      rag,
      status: cycle.status,
      daysUntilDeadline: daysUntil,
      paymentNoticeDeadline: cycle.paymentNoticeDeadline,
      payLessDeadline: cycle.payLessDeadline,
      finalDateForPayment: cycle.finalDateForPayment,
      dueDate: cycle.dueDate,
      applicationExpectedDate: cycle.applicationExpectedDate,
      dateDerivation: cycle.dateDerivation as Record<string, string>,
    }
  }).sort((a, b) => a.nextDeadlineDate.getTime() - b.nextDeadlineDate.getTime())
}
