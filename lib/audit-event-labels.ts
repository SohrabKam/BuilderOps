// Human-readable labels for AuditEvent.eventType, shared by every view that
// renders an audit trail (subcontract detail page, cycle bundle/print page).
// Previously duplicated in both places with two different, out-of-sync
// entry lists — kept as one superset here so a new event type only needs
// labelling once.
export const AUDIT_EVENT_LABELS: Record<string, string> = {
  "notice.payment.served": "Payment notice served",
  "notice.payless.served": "Pay-less notice served",
  "notice.email.sent": "Notice email sent",
  "notice.email.delivered": "Notice email delivered",
  "notice.email.delayed": "Notice email delivery delayed",
  "notice.email.bounced": "Notice email bounced",
  "notice.email.complained": "Notice email spam complaint",
  "cycle.paid": "Marked as paid",
  "cycle.marked_paid": "Marked as paid",
  "cycle.closed": "Cycle closed",
  "cycle.milestone_date_set": "Milestone application date set",
  "application.logged": "Application logged",
  "application.received": "Application received",
  "assessment.saved": "Assessment saved",
  "assessment.initialised": "Assessment initialised",
  "deadline.breached": "Payment notice deadline passed",
  "alert.sent": "Deadline alert sent",
  "alert.document_expiry": "Document expiry alert sent",
  "document.expiry.alert": "Document expiry alert sent",
  "alert.missed_application": "Missed application alert sent",
  "variation.logged": "Variation logged",
  "variation.created": "Variation logged",
  "variation.updated": "Variation updated",
  "retention.updated": "Retention dates updated",
  "retention.pc_released": "PC retention released",
  "retention.mcd_released": "MCD retention released",
  "retention.release.alert": "Retention release alert sent",
  "schedule.extended": "Payment schedule extended",
  "contract.settings.updated": "Contract settings updated",
  "subcontract.created": "Subcontract created",
  "subcontract.archived": "Subcontract archived",
}
