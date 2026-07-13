"use server"
import { requireOrgAction } from "@/lib/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { toSafeErrorMessage } from "@/lib/prisma-error"

function parseAmount(raw: FormDataEntryValue | null): number {
  const value = parseFloat(raw as string)
  if (raw === null || raw === "" || Number.isNaN(value) || value < 0) {
    throw new Error("Amount applied must be a valid, non-negative number")
  }
  return value
}

// Called when a cycle workspace is opened for the first time.
// Creates the Assessment and copies lines from the ActivitySchedule template,
// filling previouslyCertified from the most recently certified cycle.
export async function initAssessment(cycleId: string) {
  try {
    const { org, userId } = await requireOrgAction()

    const cycle = await db.paymentCycle.findFirst({
      where: {
        id: cycleId,
        paymentSchedule: { subcontractOrder: { organisationId: org.id } },
      },
      include: {
        assessment: true,
        paymentSchedule: {
          include: {
            subcontractOrder: {
              include: { scheduleLines: { orderBy: { sortOrder: "asc" } } },
            },
            cycles: {
              where: { status: { in: ["NOTICE_SERVED", "PAY_LESS_SERVED", "PAID", "CLOSED"] } },
              orderBy: { cycleNumber: "desc" },
              take: 1,
              include: {
                assessment: { include: { lines: { orderBy: { sortOrder: "asc" } } } },
              },
            },
          },
        },
      },
    })

    if (!cycle) throw new Error("Cycle not found")
    if (cycle.assessment) return { assessmentId: cycle.assessment.id } // already initialised

    const order = cycle.paymentSchedule.subcontractOrder
    const templateLines = order.scheduleLines
    const lastCycle = cycle.paymentSchedule.cycles[0]
    const lastLines = lastCycle?.assessment?.lines ?? []

    // Build a map of itemRef → valueToDate from last certified cycle
    const prevMap = new Map(lastLines.map((l) => [l.itemRef, Number(l.valueToDate)]))

    // Both only depend on data already fetched above (order.id, templateLines) —
    // independent of each other, so run them together.
    const [assessment, variations] = await Promise.all([
      db.assessment.create({
        data: {
          paymentCycleId: cycleId,
          lines: {
            create: templateLines.map((tl) => {
              const prevCert = prevMap.get(tl.itemRef) ?? 0
              return {
                sortOrder: tl.sortOrder,
                itemRef: tl.itemRef,
                description: tl.description,
                contractValue: tl.contractValue,
                isVariation: tl.isVariation,
                indentLevel: tl.indentLevel,
                variationId: tl.variationId,
                valueToDate: prevCert,
                previouslyCertified: prevCert,
                thisCycle: 0,
              }
            }),
          },
        },
      }),
      // Also add any instructed/agreed variations not yet in template
      db.variation.findMany({
        where: {
          subcontractOrderId: order.id,
          status: { in: ["INSTRUCTED", "AGREED"] },
        },
        orderBy: { createdAt: "asc" },
      }),
    ])

    const templateRefs = new Set(templateLines.map((l) => l.itemRef))
    const newVarLines = variations.filter((v) => !templateRefs.has(`VAR-${v.reference}`))

    // Independent writes — the new variation lines don't affect the cycle
    // status update and vice versa.
    await Promise.all([
      newVarLines.length > 0
        ? db.assessmentLine.createMany({
            data: newVarLines.map((v, i) => ({
              assessmentId: assessment.id,
              sortOrder: templateLines.length + i + 1,
              itemRef: `VAR-${v.reference}`,
              description: v.description,
              contractValue: Number(v.agreedValue ?? v.estimatedValue ?? 0),
              isVariation: true,
              variationId: v.id,
              valueToDate: 0,
              previouslyCertified: 0,
              thisCycle: 0,
            })),
          })
        : Promise.resolve(),
      db.paymentCycle.update({
        where: { id: cycleId },
        data: { status: "UNDER_ASSESSMENT" },
      }),
    ])

    await db.auditEvent.create({
      data: {
        organisationId: org.id,
        subcontractOrderId: order.id,
        paymentCycleId: cycleId,
        userId,
        eventType: "assessment.initialised",
        payload: { linesCreated: templateLines.length + newVarLines.length },
      },
    })

    revalidatePath(`/cycles/${cycleId}`)
    return { assessmentId: assessment.id }
  } catch (error) {
    throw new Error(toSafeErrorMessage(error))
  }
}

export async function logApplication(cycleId: string, formData: FormData) {
  try {
    const { org, userId } = await requireOrgAction()

    const cycle = await db.paymentCycle.findFirst({
      where: {
        id: cycleId,
        paymentSchedule: { subcontractOrder: { organisationId: org.id } },
      },
      include: {
        application: true,
        paymentSchedule: { include: { subcontractOrder: true } },
      },
    })
    if (!cycle) throw new Error("Cycle not found")
    if (cycle.application) throw new Error("Application already logged — use updateApplication to edit")

    const amountApplied = parseAmount(formData.get("amountApplied"))
    const dateReceived = formData.get("dateReceived") as string
    const notes = (formData.get("notes") as string) || undefined
    const receivedVia = (formData.get("receivedVia") as string) || "manual"
    const attachmentUrl = (formData.get("attachmentUrl") as string) || undefined

    await db.application.create({
      data: {
        paymentCycleId: cycleId,
        amountApplied,
        dateReceived: new Date(dateReceived),
        receivedVia,
        notes,
        attachmentUrl,
      },
    })

    await db.paymentCycle.update({
      where: { id: cycleId },
      data: { status: "APPLICATION_RECEIVED" },
    })

    const order = cycle.paymentSchedule.subcontractOrder
    await db.auditEvent.create({
      data: {
        organisationId: org.id,
        subcontractOrderId: order.id,
        paymentCycleId: cycleId,
        userId,
        eventType: "application.received",
        payload: { amountApplied, dateReceived, receivedVia, notes },
      },
    })

    revalidatePath(`/cycles/${cycleId}`)
  } catch (error) {
    throw new Error(toSafeErrorMessage(error))
  }
}

export async function updateApplication(applicationId: string, formData: FormData) {
  try {
    const { org } = await requireOrgAction()

    const application = await db.application.findFirst({
      where: {
        id: applicationId,
        paymentCycle: {
          paymentSchedule: { subcontractOrder: { organisationId: org.id } },
        },
      },
      include: { paymentCycle: true },
    })
    if (!application) throw new Error("Application not found")

    const amountApplied = parseAmount(formData.get("amountApplied"))
    const dateReceived = formData.get("dateReceived") as string
    const notes = (formData.get("notes") as string) || undefined
    const receivedVia = (formData.get("receivedVia") as string) || undefined
    const attachmentUrl = formData.get("attachmentUrl") as string | null

    await db.application.update({
      where: { id: applicationId },
      data: {
        amountApplied,
        dateReceived: new Date(dateReceived),
        notes: notes ?? null,
        ...(receivedVia ? { receivedVia } : {}),
        attachmentUrl: attachmentUrl || null,
      },
    })

    revalidatePath(`/cycles/${application.paymentCycleId}`)
  } catch (error) {
    throw new Error(toSafeErrorMessage(error))
  }
}
