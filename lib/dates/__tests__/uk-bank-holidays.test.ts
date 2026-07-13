import { describe, it, expect } from "vitest"
import { isBankHoliday, isBusinessDay, addBusinessDays } from "../uk-bank-holidays"

// Golden data: the exact England & Wales bank holidays previously hardcoded
// in this file for 2024-2027, sourced from GOV.UK. Used to confirm the
// algorithmic implementation reproduces real historical/confirmed dates,
// including the Christmas/Boxing Day weekend-substitution edge case in 2027.
const GOLDEN_HOLIDAYS: string[] = [
  "2024-01-01", "2024-03-29", "2024-04-01", "2024-05-06", "2024-05-27",
  "2024-08-26", "2024-12-25", "2024-12-26",
  "2025-01-01", "2025-04-18", "2025-04-21", "2025-05-05", "2025-05-26",
  "2025-08-25", "2025-12-25", "2025-12-26",
  "2026-01-01", "2026-04-03", "2026-04-06", "2026-05-04", "2026-05-25",
  "2026-08-31", "2026-12-25", "2026-12-28",
  "2027-01-01", "2027-03-26", "2027-03-29", "2027-05-03", "2027-05-31",
  "2027-08-30", "2027-12-27", "2027-12-28",
]

function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

describe("isBankHoliday", () => {
  it("reproduces every known 2024-2027 GOV.UK holiday date", () => {
    for (const iso of GOLDEN_HOLIDAYS) {
      expect(isBankHoliday(fromISO(iso)), `expected ${iso} to be a bank holiday`).toBe(true)
    }
  })

  it("does not falsely flag the day before/after each golden holiday", () => {
    for (const iso of GOLDEN_HOLIDAYS) {
      const d = fromISO(iso)
      const dayBefore = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)
      const dayAfter = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
      if (!GOLDEN_HOLIDAYS.includes(
        `${dayBefore.getFullYear()}-${String(dayBefore.getMonth() + 1).padStart(2, "0")}-${String(dayBefore.getDate()).padStart(2, "0")}`
      )) {
        expect(isBankHoliday(dayBefore)).toBe(false)
      }
      if (!GOLDEN_HOLIDAYS.includes(
        `${dayAfter.getFullYear()}-${String(dayAfter.getMonth() + 1).padStart(2, "0")}-${String(dayAfter.getDate()).padStart(2, "0")}`
      )) {
        expect(isBankHoliday(dayAfter)).toBe(false)
      }
    }
  })

  it("does not go stale beyond the old hardcoded 2024-2027 range", () => {
    // New Year's Day, computed for years far outside the old table, still
    // correctly resolves (including weekend substitution).
    const years = [2028, 2030, 2035, 2040]
    for (const year of years) {
      const jan1 = new Date(year, 0, 1)
      const day = jan1.getDay()
      const expected = day === 6 ? new Date(year, 0, 3) : day === 0 ? new Date(year, 0, 2) : jan1
      expect(isBankHoliday(expected), `New Year's Day holiday for ${year}`).toBe(true)
    }
  })

  it("recognises a bank holiday regardless of the host process timezone (BST regression)", () => {
    const original = process.env.TZ
    process.env.TZ = "Europe/London"
    try {
      // Spring bank holiday 2026 (last Monday of May), constructed as a
      // local date the same way lib/dates/cycle-generator.ts does.
      const springBankHoliday2026 = new Date(2026, 4, 25)
      expect(isBankHoliday(springBankHoliday2026)).toBe(true)
    } finally {
      process.env.TZ = original
    }
  })
})

describe("isBusinessDay / addBusinessDays", () => {
  it("treats weekends as non-business days", () => {
    // 2026-07-11 is a Saturday, 2026-07-12 a Sunday.
    expect(isBusinessDay(new Date(2026, 6, 11))).toBe(false)
    expect(isBusinessDay(new Date(2026, 6, 12))).toBe(false)
    expect(isBusinessDay(new Date(2026, 6, 13))).toBe(true)
  })

  it("skips both weekends and bank holidays when adding business days", () => {
    // Thu 2026-12-24 + 2 business days: 25th (Fri, Christmas), 26th-27th
    // (weekend), and 28th (Mon, Boxing Day substitute) are all skipped, so
    // the 2 business days land on Tue 29th and Wed 30th.
    const start = new Date(2026, 11, 24)
    const result = addBusinessDays(start, 2)
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(11)
    expect(result.getDate()).toBe(30)
  })
})
