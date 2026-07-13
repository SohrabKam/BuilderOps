"use client"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createContract, type CreateContractInput } from "@/lib/actions/contracts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDate, addDays, subtractDays } from "@/lib/dates/uk-bank-holidays"
import { ChevronRight, ChevronLeft, Plus, Trash2, ClipboardPaste } from "lucide-react"

type Project = { id: string; name: string }
type Subcontractor = { id: string; name: string }
type ScheduleLine = { itemRef: string; description: string; contractValue: string }

const STEPS = ["Subcontractor", "Contract details", "Payment terms", "Activity schedule", "Review"] as const

// Form schema keeps numeric fields as strings (HTML inputs always return strings)
const schema = z.object({
  projectId: z.string().min(1, "Select a project"),
  subcontractorId: z.string().optional(),
  newSubcontractorName: z.string().optional(),
  newSubcontractorEmails: z.string().optional(),
  reference: z.string().min(1, "Reference required"),
  description: z.string().optional(),
  contractForm: z.enum(["JCT_ICSUB", "DOM1", "BESPOKE", "SCHEME_DEFAULT"]),
  contractSum: z.string().min(1, "Required"),
  retentionPct: z.string(),
  signatory: z.string().optional(),
  appDueDateRule: z.enum(["FIXED_DAY_OF_MONTH", "FIXED_DAY_OF_WEEK", "MILESTONE"]),
  appDueDayOfMonth: z.string().optional(),
  appDueDayOfWeek: z.string().optional(),
  appDueWeekOfMonth: z.string().optional(),
  dueDateOffsetDays: z.string(),
  dueDateOffsetType: z.enum(["CALENDAR", "BUSINESS"]),
  paymentNoticeDeadlineDays: z.string(),
  paymentNoticeDeadlineType: z.enum(["CALENDAR", "BUSINESS"]),
  finalDateOffsetDays: z.string(),
  finalDateOffsetType: z.enum(["CALENDAR", "BUSINESS"]),
  payLessDeadlineDays: z.string(),
  payLessDeadlineType: z.enum(["CALENDAR", "BUSINESS"]),
  scheduleStartDate: z.string().min(1, "Required"),
  scheduleEndDate: z.string().min(1, "Required"),
})

type FormValues = z.infer<typeof schema>

export function ContractSetupWizard({
  projects,
  subcontractors,
}: {
  projects: Project[]
  subcontractors: Subcontractor[]
}) {
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [scheduleLines, setScheduleLines] = useState<ScheduleLine[]>([
    { itemRef: "", description: "", contractValue: "" },
  ])
  const [scheduleError, setScheduleError] = useState("")
  const router = useRouter()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      contractForm: "SCHEME_DEFAULT",
      retentionPct: "5",
      appDueDateRule: "FIXED_DAY_OF_MONTH",
      appDueDayOfMonth: "25",
      appDueDayOfWeek: "4",
      appDueWeekOfMonth: "-1",
      dueDateOffsetDays: "7",
      dueDateOffsetType: "CALENDAR",
      paymentNoticeDeadlineDays: "5",
      paymentNoticeDeadlineType: "CALENDAR",
      finalDateOffsetDays: "21",
      finalDateOffsetType: "CALENDAR",
      payLessDeadlineDays: "7",
      payLessDeadlineType: "CALENDAR",
    },
  })

  const values = form.watch()

  function advanceStep() {
    if (step === 3) {
      const valid = scheduleLines.filter((l) => l.itemRef && l.description && l.contractValue)
      if (valid.length === 0) {
        setScheduleError("Add at least one activity schedule line")
        return
      }
      setScheduleError("")
    }
    setStep((s) => s + 1)
  }

  async function onSubmit(data: FormValues) {
    const validLines = scheduleLines.filter((l) => l.itemRef && l.description && l.contractValue)
    if (validLines.length === 0) {
      setStep(3)
      setScheduleError("Add at least one activity schedule line")
      return
    }
    setSubmitting(true)
    try {
      const result = await createContract({
        ...(data as unknown as CreateContractInput),
        scheduleLines: validLines.map((l) => ({
          itemRef: l.itemRef,
          description: l.description,
          contractValue: parseFloat(l.contractValue),
        })),
      })
      toast.success("Subcontract created and payment cycles generated")
      router.push(`/subcontracts/${result.orderId}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  function parsePaste(text: string) {
    const rows = text.trim().split("\n").map((r) => r.split("\t"))
    const parsed: ScheduleLine[] = []
    for (const row of rows) {
      if (row.length < 2) continue
      const [col1, col2, col3] = row.map((c) => c.trim())
      // Support 2-column (description, value) or 3-column (ref, description, value)
      if (row.length === 2) {
        parsed.push({ itemRef: String(parsed.length + 1), description: col1, contractValue: col2.replace(/[£,]/g, "") })
      } else {
        parsed.push({ itemRef: col1, description: col2, contractValue: (col3 ?? "0").replace(/[£,]/g, "") })
      }
    }
    return parsed
  }

  function updateLine(i: number, field: keyof ScheduleLine, value: string) {
    setScheduleLines((prev) => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l))
  }

  function removeLine(i: number) {
    setScheduleLines((prev) => prev.filter((_, idx) => idx !== i))
  }

  function addLine() {
    setScheduleLines((prev) => [...prev, { itemRef: "", description: "", contractValue: "" }])
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                i < step
                  ? "bg-indigo-600 text-white"
                  : i === step
                  ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-600"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {i + 1}
            </div>
            <span className={`text-sm ${i === step ? "font-medium text-slate-900" : "text-slate-400"}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-slate-300" />}
          </div>
        ))}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Step 0: Subcontractor */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Which subcontractor is this for?</h2>

            <div>
              <Label>Project</Label>
              <Select onValueChange={(v) => form.setValue("projectId", v as string)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select project…" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.projectId && (
                <p className="text-red-500 text-xs mt-1">{form.formState.errors.projectId.message}</p>
              )}
            </div>

            <div>
              <Label>Existing subcontractor</Label>
              <Select onValueChange={(v) => form.setValue("subcontractorId", v as string)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select or add new…" />
                </SelectTrigger>
                <SelectContent>
                  {subcontractors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-slate-500 mb-3">Or add a new subcontractor:</p>
              <div className="space-y-3">
                <div>
                  <Label>Company name</Label>
                  <Input {...form.register("newSubcontractorName")} className="mt-1" placeholder="ABC Contractors Ltd" />
                </div>
                <div>
                  <Label>Notice service email(s)</Label>
                  <Input
                    {...form.register("newSubcontractorEmails")}
                    className="mt-1"
                    placeholder="john@abc.com, contracts@abc.com"
                  />
                  <p className="text-xs text-slate-400 mt-1">Comma-separated. Notices will be emailed here.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Contract details */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Contract details</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Order reference</Label>
                <Input {...form.register("reference")} className="mt-1" placeholder="SC-001" />
                {form.formState.errors.reference && (
                  <p className="text-red-500 text-xs mt-1">{form.formState.errors.reference.message}</p>
                )}
              </div>
              <div>
                <Label>Contract form</Label>
                <Select
                  defaultValue={form.getValues("contractForm")}
                  onValueChange={(v) => form.setValue("contractForm", v as FormValues["contractForm"])}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SCHEME_DEFAULT">Scheme defaults</SelectItem>
                    <SelectItem value="JCT_ICSUB">JCT ICSub/D</SelectItem>
                    <SelectItem value="DOM1">DOM/1</SelectItem>
                    <SelectItem value="BESPOKE">Bespoke</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Description (optional)</Label>
              <Input {...form.register("description")} className="mt-1" placeholder="Groundworks package" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contract sum (£)</Label>
                <Input
                  {...form.register("contractSum")}
                  type="number"
                  step="0.01"
                  className="mt-1"
                  placeholder="250000"
                />
                {form.formState.errors.contractSum && (
                  <p className="text-red-500 text-xs mt-1">{form.formState.errors.contractSum.message}</p>
                )}
              </div>
              <div>
                <Label>Retention % (e.g. 5)</Label>
                <Input
                  {...form.register("retentionPct")}
                  type="number"
                  step="0.1"
                  className="mt-1"
                  placeholder="5"
                />
              </div>
            </div>

            <div>
              <Label>Authorised signatory</Label>
              <Input {...form.register("signatory")} className="mt-1" placeholder="Jane Smith, Commercial Director" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Schedule start date</Label>
                <Input {...form.register("scheduleStartDate")} type="date" className="mt-1" />
              </div>
              <div>
                <Label>Schedule end date</Label>
                <Input {...form.register("scheduleEndDate")} type="date" className="mt-1" />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Payment terms */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold">Payment terms</h2>
            <p className="text-sm text-slate-500">
              Scheme for Construction Contracts defaults pre-loaded. Adjust to match your subcontract.
            </p>

            <div>
              <Label>When does the subcontractor apply for payment?</Label>
              <Select
                defaultValue={form.getValues("appDueDateRule")}
                onValueChange={(v) => form.setValue("appDueDateRule", v as FormValues["appDueDateRule"])}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED_DAY_OF_MONTH">Fixed day of month (e.g. 25th)</SelectItem>
                  <SelectItem value="FIXED_DAY_OF_WEEK">Fixed day of week (e.g. last Thursday)</SelectItem>
                  <SelectItem value="MILESTONE">Milestone-driven (set per cycle)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {values.appDueDateRule === "FIXED_DAY_OF_MONTH" && (
              <div className="ml-4">
                <Label>Day of month</Label>
                <Input
                  {...form.register("appDueDayOfMonth")}
                  type="number"
                  min={1}
                  max={31}
                  className="mt-1 w-24"
                  placeholder="25"
                />
              </div>
            )}

            {values.appDueDateRule === "FIXED_DAY_OF_WEEK" && (
              <div className="ml-4 grid grid-cols-2 gap-3">
                <div>
                  <Label>Day of week</Label>
                  <Select
                    defaultValue={form.getValues("appDueDayOfWeek") ?? "4"}
                    onValueChange={(v) => form.setValue("appDueDayOfWeek", v as string)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Which occurrence</Label>
                  <Select
                    defaultValue={form.getValues("appDueWeekOfMonth") ?? "-1"}
                    onValueChange={(v) => form.setValue("appDueWeekOfMonth", v as string)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1st</SelectItem>
                      <SelectItem value="2">2nd</SelectItem>
                      <SelectItem value="3">3rd</SelectItem>
                      <SelectItem value="4">4th</SelectItem>
                      <SelectItem value="-1">Last</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <TermRow
              label="How many days after the application is payment due?"
              daysName="dueDateOffsetDays"
              typeName="dueDateOffsetType"
              form={form}
            />
            <TermRow
              label="How many days after the due date must you issue your payment notice?"
              daysName="paymentNoticeDeadlineDays"
              typeName="paymentNoticeDeadlineType"
              form={form}
            />
            <TermRow
              label="How many days after the due date is the final date for payment?"
              daysName="finalDateOffsetDays"
              typeName="finalDateOffsetType"
              form={form}
            />
            <TermRow
              label="How many days before the final date must you issue a pay-less notice?"
              daysName="payLessDeadlineDays"
              typeName="payLessDeadlineType"
              form={form}
            />

            <TimelinePreview values={values} />
          </div>
        )}

        {/* Step 3: Activity schedule */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Activity schedule</h2>
            <p className="text-sm text-slate-500">
              Define the work items this subcontract is broken into. Each line becomes a row in the assessment grid.
            </p>

            <div className="rounded-lg border border-dashed border-indigo-200 bg-indigo-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardPaste className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-700">Paste from Excel / spreadsheet</span>
              </div>
              <p className="text-xs text-slate-500 mb-2">
                Copy three columns from your spreadsheet (Ref, Description, Value) and paste below — rows are auto-parsed.
              </p>
              <textarea
                className="w-full h-20 text-xs font-mono border rounded p-2 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder={"A1\tExcavation & earthworks\t45000\nA2\tPiling works\t85000\nA3\tGround beams & slab\t62000"}
                onPaste={(e) => {
                  e.preventDefault()
                  const text = e.clipboardData.getData("text")
                  const parsed = parsePaste(text)
                  if (parsed.length > 0) {
                    setScheduleLines(parsed)
                    setScheduleError("")
                  }
                }}
                readOnly
              />
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-[80px_1fr_120px_32px] gap-2 text-xs font-medium text-slate-500 px-1">
                <span>Ref</span><span>Description</span><span>Value (£)</span><span />
              </div>
              {scheduleLines.map((line, i) => (
                <div key={i} className="grid grid-cols-[80px_1fr_120px_32px] gap-2 items-center">
                  <Input
                    value={line.itemRef}
                    onChange={(e) => updateLine(i, "itemRef", e.target.value)}
                    placeholder="A1"
                    className="text-sm h-8"
                  />
                  <Input
                    value={line.description}
                    onChange={(e) => updateLine(i, "description", e.target.value)}
                    placeholder="Description"
                    className="text-sm h-8"
                  />
                  <Input
                    value={line.contractValue}
                    onChange={(e) => updateLine(i, "contractValue", e.target.value)}
                    type="number"
                    step="0.01"
                    placeholder="0"
                    className="text-sm h-8"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    className="text-slate-300 hover:text-red-400 flex items-center justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addLine} className="mt-1">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add line
              </Button>
            </div>

            {scheduleError && <p className="text-red-500 text-sm">{scheduleError}</p>}

            <div className="rounded bg-slate-50 border px-4 py-2.5 flex justify-between text-sm">
              <span className="text-slate-500">Total contract value</span>
              <span className="font-medium">
                £{scheduleLines
                  .reduce((sum, l) => sum + (parseFloat(l.contractValue) || 0), 0)
                  .toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Review & create</h2>
            <div className="rounded-lg border bg-white divide-y text-sm">
              <ReviewRow label="Reference" value={values.reference} />
              <ReviewRow
                label="Contract sum"
                value={`£${Number(values.contractSum || 0).toLocaleString("en-GB")}`}
              />
              <ReviewRow label="Retention" value={`${values.retentionPct}%`} />
              <ReviewRow label="Contract form" value={values.contractForm} />
              <ReviewRow
                label="Due date"
                value={`${values.dueDateOffsetDays} ${values.dueDateOffsetType.toLowerCase()} days after application`}
              />
              <ReviewRow
                label="Payment notice deadline"
                value={`${values.paymentNoticeDeadlineDays} ${values.paymentNoticeDeadlineType.toLowerCase()} days after due date`}
              />
              <ReviewRow
                label="Final date for payment"
                value={`${values.finalDateOffsetDays} ${values.finalDateOffsetType.toLowerCase()} days after due date`}
              />
              <ReviewRow
                label="Pay-less notice deadline"
                value={`${values.payLessDeadlineDays} ${values.payLessDeadlineType.toLowerCase()} days before final date`}
              />
              <ReviewRow label="Schedule" value={`${values.scheduleStartDate} → ${values.scheduleEndDate}`} />
              <ReviewRow
                label="Activity schedule lines"
                value={`${scheduleLines.filter((l) => l.itemRef && l.description).length} lines`}
              />
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
              <strong>Disclaimer:</strong> NoticeGuard generates documents and tracks deadlines. It does not
              provide legal advice. Review all notice templates against your specific contract terms.
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={advanceStep}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create subcontract"}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}

function TermRow({
  label,
  daysName,
  typeName,
  form,
}: {
  label: string
  daysName: keyof FormValues
  typeName: keyof FormValues
  form: ReturnType<typeof useForm<FormValues>>
}) {
  return (
    <div>
      <Label className="text-sm leading-snug">{label}</Label>
      <div className="flex gap-2 mt-1">
        <Input
          {...form.register(daysName)}
          type="number"
          min={1}
          className="w-20"
        />
        <Select
          defaultValue={form.getValues(typeName) as string}
          onValueChange={(v) => form.setValue(typeName, v as "CALENDAR" | "BUSINESS")}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CALENDAR">calendar days</SelectItem>
            <SelectItem value="BUSINESS">business days</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function TimelinePreview({ values }: { values: FormValues }) {
  const today = new Date()
  const appDate = today
  const dueDateType = values.dueDateOffsetType
  const pnType = values.paymentNoticeDeadlineType
  const fdType = values.finalDateOffsetType
  const plType = values.payLessDeadlineType

  const dueDate = addDays(appDate, Number(values.dueDateOffsetDays) || 7, dueDateType)
  const pnDeadline = addDays(dueDate, Number(values.paymentNoticeDeadlineDays) || 5, pnType)
  const finalDate = addDays(dueDate, Number(values.finalDateOffsetDays) || 21, fdType)
  const plDeadline = subtractDays(finalDate, Number(values.payLessDeadlineDays) || 7, plType)

  const events = [
    { label: "Application received", date: appDate },
    { label: "Due date", date: dueDate },
    { label: "⚠ Payment notice deadline", date: pnDeadline },
    { label: "⚠ Pay-less notice deadline", date: plDeadline },
    { label: "Final date for payment", date: finalDate },
  ].sort((a, b) => a.date.getTime() - b.date.getTime())

  return (
    <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-4 mt-2">
      <p className="text-xs font-medium text-indigo-700 mb-3">Live timeline preview (based on application today)</p>
      <div className="space-y-1.5">
        {events.map((e, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <span className="w-32 text-xs font-mono text-indigo-600 shrink-0">{formatDate(e.date)}</span>
            <span className="text-slate-700">{e.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between px-4 py-2.5">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value ?? "—"}</span>
    </div>
  )
}
