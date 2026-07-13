import { addDays, subtractDays, formatDate } from "./uk-bank-holidays"
import type { PaymentSchedule, DayType, ApplicationDueDateRule } from "../generated/prisma/client"

export type GeneratedCycle = {
  cycleNumber: number
  applicationExpectedDate: Date
  dueDate: Date
  paymentNoticeDeadline: Date
  finalDateForPayment: Date
  payLessDeadline: Date
  dateDerivation: DateDerivation
}

export type DateDerivation = {
  applicationExpectedDate: string
  dueDate: string
  paymentNoticeDeadline: string
  finalDateForPayment: string
  payLessDeadline: string
}

export function getApplicationExpectedDate(
  schedule: Pick<
    PaymentSchedule,
    "appDueDateRule" | "appDueDayOfMonth" | "appDueDayOfWeek" | "appDueWeekOfMonth"
  >,
  cycleMonth: Date
): Date {
  const rule = schedule.appDueDateRule as ApplicationDueDateRule

  if (rule === "FIXED_DAY_OF_MONTH") {
    const day = schedule.appDueDayOfMonth ?? 25
    const daysInMonth = new Date(cycleMonth.getFullYear(), cycleMonth.getMonth() + 1, 0).getDate()
    // Clamp so a day configured for e.g. the 31st lands on the last day of
    // a shorter month instead of silently overflowing into next month.
    const clampedDay = Math.min(day, daysInMonth)
    return new Date(cycleMonth.getFullYear(), cycleMonth.getMonth(), clampedDay)
  }

  if (rule === "FIXED_DAY_OF_WEEK") {
    const targetDay = schedule.appDueDayOfWeek ?? 4 // Thursday
    const weekOfMonth = schedule.appDueWeekOfMonth ?? -1 // -1 = last
    const year = cycleMonth.getFullYear()
    const month = cycleMonth.getMonth()

    if (weekOfMonth === -1) {
      // Last occurrence of targetDay in month
      const lastDay = new Date(year, month + 1, 0)
      let d = lastDay
      while (d.getDay() !== targetDay) {
        d = new Date(year, month, d.getDate() - 1)
      }
      return d
    }

    // Nth occurrence, falling back to the last occurrence in the month if
    // the configured Nth doesn't exist (e.g. a "5th Friday" in a month that
    // only has four).
    let d = new Date(year, month, 1)
    let count = 0
    let lastMatch: Date | null = null
    while (d.getMonth() === month) {
      if (d.getDay() === targetDay) {
        count++
        lastMatch = d
        if (count === weekOfMonth) return d
      }
      d = new Date(year, month, d.getDate() + 1)
    }
    return lastMatch ?? new Date(year, month, 25)
  }

  // MILESTONE — application date set manually per cycle; return a placeholder
  return new Date(cycleMonth.getFullYear(), cycleMonth.getMonth(), 25)
}

export function generateCycles(
  schedule: PaymentSchedule,
  existingCount = 0
): GeneratedCycle[] {
  const cycles: GeneratedCycle[] = []
  const start = new Date(schedule.scheduleStartDate)
  const end = new Date(schedule.scheduleEndDate)

  const dueDateType = schedule.dueDateOffsetType as DayType
  const pnType = schedule.paymentNoticeDeadlineType as DayType
  const fdType = schedule.finalDateOffsetType as DayType
  const plType = schedule.payLessDeadlineType as DayType

  let cycleDate = new Date(start.getFullYear(), start.getMonth(), 1)
  let cycleNumber = existingCount + 1

  while (cycleDate <= end) {
    const appExpected = getApplicationExpectedDate(schedule, cycleDate)

    if (appExpected > end) break

    const dueDate = addDays(appExpected, schedule.dueDateOffsetDays, dueDateType)
    const paymentNoticeDeadline = addDays(dueDate, schedule.paymentNoticeDeadlineDays, pnType)
    const finalDateForPayment = addDays(dueDate, schedule.finalDateOffsetDays, fdType)
    const payLessDeadline = subtractDays(finalDateForPayment, schedule.payLessDeadlineDays, plType)

    const dueDayLabel = dueDateType === "BUSINESS" ? "business days" : "days"
    const pnDayLabel = pnType === "BUSINESS" ? "business days" : "days"
    const fdDayLabel = fdType === "BUSINESS" ? "business days" : "days"
    const plDayLabel = plType === "BUSINESS" ? "business days" : "days"

    cycles.push({
      cycleNumber,
      applicationExpectedDate: appExpected,
      dueDate,
      paymentNoticeDeadline,
      finalDateForPayment,
      payLessDeadline,
      dateDerivation: {
        applicationExpectedDate: `Application due date per schedule rule`,
        dueDate: `Due date: ${schedule.dueDateOffsetDays} ${dueDayLabel} after application received on ${formatDate(appExpected)} → ${formatDate(dueDate)}`,
        paymentNoticeDeadline: `Payment notice deadline: ${schedule.paymentNoticeDeadlineDays} ${pnDayLabel} after due date ${formatDate(dueDate)} → ${formatDate(paymentNoticeDeadline)}`,
        finalDateForPayment: `Final date for payment: ${schedule.finalDateOffsetDays} ${fdDayLabel} after due date ${formatDate(dueDate)} → ${formatDate(finalDateForPayment)}`,
        payLessDeadline: `Pay-less notice deadline: ${schedule.payLessDeadlineDays} ${plDayLabel} before final date ${formatDate(finalDateForPayment)} → ${formatDate(payLessDeadline)}`,
      },
    })

    // Next month
    cycleDate = new Date(cycleDate.getFullYear(), cycleDate.getMonth() + 1, 1)
    cycleNumber++
  }

  return cycles
}
