// Shared serialization for /api/v1 JSON responses. All Decimal fields are
// converted to plain numbers explicitly (rather than relying on Prisma's
// Decimal having its own JSON serialization behavior) — keeps this
// consistent with how the rest of the app already handles Decimal fields
// crossing a serialization boundary, and gives API consumers plain numbers.
import type {
  SubcontractOrder,
  Project,
  Subcontractor,
  ComplianceDocument,
  PaymentCycle,
  Application,
  Assessment,
  AssessmentLine,
  PaymentNotice,
  PayLessNotice,
} from "@/lib/generated/prisma/client"

export function serializeComplianceDocument(doc: ComplianceDocument) {
  return {
    id: doc.id,
    documentType: doc.documentType,
    fileUrl: doc.fileUrl,
    issueDate: doc.issueDate,
    expiryDate: doc.expiryDate,
    status: doc.status,
    notes: doc.notes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export function serializeSubcontract(
  order: SubcontractOrder & {
    project: Pick<Project, "id" | "name">
    subcontractor: Pick<Subcontractor, "id" | "name" | "companyNumber" | "cisStatus"> & {
      complianceDocs?: ComplianceDocument[]
    }
  }
) {
  return {
    id: order.id,
    reference: order.reference,
    description: order.description,
    contractForm: order.contractForm,
    contractSum: Number(order.contractSum),
    retentionPct: Number(order.retentionPct),
    retentionCap: order.retentionCap !== null ? Number(order.retentionCap) : null,
    isActive: order.isActive,
    project: { id: order.project.id, name: order.project.name },
    subcontractor: {
      id: order.subcontractor.id,
      name: order.subcontractor.name,
      companyNumber: order.subcontractor.companyNumber,
      cisStatus: order.subcontractor.cisStatus,
      ...(order.subcontractor.complianceDocs
        ? { complianceDocuments: order.subcontractor.complianceDocs.map(serializeComplianceDocument) }
        : {}),
    },
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  }
}

export function serializeApplication(application: Application) {
  return {
    id: application.id,
    amountApplied: Number(application.amountApplied),
    dateReceived: application.dateReceived,
    receivedVia: application.receivedVia,
    attachmentUrl: application.attachmentUrl,
    notes: application.notes,
    createdAt: application.createdAt,
  }
}

export function serializeAssessmentLine(line: AssessmentLine) {
  return {
    id: line.id,
    sortOrder: line.sortOrder,
    itemRef: line.itemRef,
    description: line.description,
    contractValue: Number(line.contractValue),
    isVariation: line.isVariation,
    indentLevel: line.indentLevel,
    qtyOrPctComplete: line.qtyOrPctComplete !== null ? Number(line.qtyOrPctComplete) : null,
    valueToDate: Number(line.valueToDate),
    previouslyCertified: Number(line.previouslyCertified),
    thisCycle: Number(line.thisCycle),
    notes: line.notes,
  }
}

export function serializeAssessment(assessment: Assessment & { lines?: AssessmentLine[] }) {
  return {
    id: assessment.id,
    isLocked: assessment.isLocked,
    grossValuation: Number(assessment.grossValuation),
    retentionAmount: Number(assessment.retentionAmount),
    previouslyCert: Number(assessment.previouslyCert),
    netThisCycle: Number(assessment.netThisCycle),
    lastSavedAt: assessment.lastSavedAt,
    ...(assessment.lines ? { lines: assessment.lines.map(serializeAssessmentLine) } : {}),
  }
}

export function serializeNotice(notice: PaymentNotice | PayLessNotice) {
  return {
    id: notice.id,
    status: notice.status,
    sumDue: Number(notice.sumDue),
    basis: notice.basis,
    servedAt: notice.servedAt,
    serviceMethod: notice.serviceMethod,
  }
}

export function serializeCycle(
  cycle: PaymentCycle & {
    application?: Application | null
    assessment?: (Assessment & { lines?: AssessmentLine[] }) | null
    paymentNotice?: PaymentNotice | null
    payLessNotice?: PayLessNotice | null
  }
) {
  return {
    id: cycle.id,
    cycleNumber: cycle.cycleNumber,
    status: cycle.status,
    applicationExpectedDate: cycle.applicationExpectedDate,
    dueDate: cycle.dueDate,
    paymentNoticeDeadline: cycle.paymentNoticeDeadline,
    finalDateForPayment: cycle.finalDateForPayment,
    payLessDeadline: cycle.payLessDeadline,
    application: cycle.application ? serializeApplication(cycle.application) : null,
    assessment: cycle.assessment ? serializeAssessment(cycle.assessment) : null,
    paymentNotice: cycle.paymentNotice ? serializeNotice(cycle.paymentNotice) : null,
    payLessNotice: cycle.payLessNotice ? serializeNotice(cycle.payLessNotice) : null,
    createdAt: cycle.createdAt,
    updatedAt: cycle.updatedAt,
  }
}
