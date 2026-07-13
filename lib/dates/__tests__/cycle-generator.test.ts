import { describe, it, expect } from "vitest"
import { getApplicationExpectedDate } from "../cycle-generator"

describe("getApplicationExpectedDate — FIXED_DAY_OF_MONTH", () => {
  it("clamps to the last day of a short month instead of overflowing", () => {
    // Configured for the 31st; February 2026 only has 28 days.
    const result = getApplicationExpectedDate(
      { appDueDateRule: "FIXED_DAY_OF_MONTH", appDueDayOfMonth: 31, appDueDayOfWeek: null, appDueWeekOfMonth: null },
      new Date(2026, 1, 1)
    )
    expect(result.getMonth()).toBe(1) // stays in February, not overflowed into March
    expect(result.getDate()).toBe(28)
  })

  it("clamps correctly in a leap-year February", () => {
    const result = getApplicationExpectedDate(
      { appDueDateRule: "FIXED_DAY_OF_MONTH", appDueDayOfMonth: 31, appDueDayOfWeek: null, appDueWeekOfMonth: null },
      new Date(2028, 1, 1)
    )
    expect(result.getMonth()).toBe(1)
    expect(result.getDate()).toBe(29) // 2028 is a leap year
  })

  it("uses the exact configured day when the month is long enough", () => {
    const result = getApplicationExpectedDate(
      { appDueDateRule: "FIXED_DAY_OF_MONTH", appDueDayOfMonth: 15, appDueDayOfWeek: null, appDueWeekOfMonth: null },
      new Date(2026, 5, 1)
    )
    expect(result.getMonth()).toBe(5)
    expect(result.getDate()).toBe(15)
  })
})

describe("getApplicationExpectedDate — FIXED_DAY_OF_WEEK", () => {
  it("falls back to the last occurrence in the month when the Nth doesn't exist, not a fixed day-25 guess", () => {
    // February 2026 starts on a Sunday and has only 4 Fridays (6, 13, 20, 27) — no 5th.
    const result = getApplicationExpectedDate(
      { appDueDateRule: "FIXED_DAY_OF_WEEK", appDueDayOfMonth: null, appDueDayOfWeek: 5, appDueWeekOfMonth: 5 },
      new Date(2026, 1, 1)
    )
    expect(result.getMonth()).toBe(1)
    expect(result.getDay()).toBe(5) // still a Friday
    expect(result.getDate()).toBe(27) // the last Friday in the month, not day 25
  })

  it("finds the last occurrence of a weekday when weekOfMonth is -1", () => {
    const result = getApplicationExpectedDate(
      { appDueDateRule: "FIXED_DAY_OF_WEEK", appDueDayOfMonth: null, appDueDayOfWeek: 4, appDueWeekOfMonth: -1 },
      new Date(2026, 1, 1) // February 2026
    )
    expect(result.getDay()).toBe(4) // Thursday
    expect(result.getDate()).toBe(26) // last Thursday of Feb 2026
  })

  it("finds the Nth occurrence when it exists", () => {
    const result = getApplicationExpectedDate(
      { appDueDateRule: "FIXED_DAY_OF_WEEK", appDueDayOfMonth: null, appDueDayOfWeek: 1, appDueWeekOfMonth: 2 },
      new Date(2026, 1, 1) // February 2026, Mondays: 2, 9, 16, 23
    )
    expect(result.getDay()).toBe(1)
    expect(result.getDate()).toBe(9) // 2nd Monday
  })
})
