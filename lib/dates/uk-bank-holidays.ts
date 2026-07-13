// UK bank holidays for England & Wales, computed algorithmically so the set
// never goes stale (the previous version hardcoded 2024-2027 only). Rules:
// - Good Friday / Easter Monday derive from the computed date of Easter
//   Sunday (Anonymous Gregorian / Meeus algorithm).
// - Early May, Spring, and Summer bank holidays are the 1st/last Monday of
//   May/May/August respectively.
// - New Year's Day, Christmas Day, and Boxing Day shift to the next
//   available weekday when they fall on a weekend, per the official
//   substitute-day rule (see GOV.UK).
// All date-key comparisons use local calendar components (never
// toISOString(), which is UTC and drifts by a day whenever the process
// timezone has a non-zero offset — most days of the UK year, once BST is in
// effect).

function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

function localDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function computeEasterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

// weekday: 0 = Sunday ... 6 = Saturday
function nthWeekdayOfMonth(year: number, month: number, weekday: number, occurrence: "first" | "last"): Date {
  if (occurrence === "first") {
    const first = new Date(year, month, 1)
    const offset = (weekday - first.getDay() + 7) % 7
    return new Date(year, month, 1 + offset)
  }
  const lastOfMonth = new Date(year, month + 1, 0)
  const offset = (lastOfMonth.getDay() - weekday + 7) % 7
  return new Date(year, month, lastOfMonth.getDate() - offset)
}

// Shift a single fixed-date holiday (New Year's Day) to the following Monday
// when it falls on a weekend.
function substituteIfWeekend(date: Date): Date {
  const day = date.getDay()
  if (day === 6) return addLocalDays(date, 2) // Saturday -> Monday
  if (day === 0) return addLocalDays(date, 1) // Sunday -> Monday
  return date
}

// Christmas Day and Boxing Day are handled together because their
// substitute days can collide (e.g. Christmas Day on Saturday, Boxing Day on
// Sunday both want "the next Monday" — Boxing Day has to take Tuesday).
function christmasAndBoxingDay(year: number): [Date, Date] {
  const christmasDay = new Date(year, 11, 25)
  const boxingDay = new Date(year, 11, 26)
  const christmasWeekday = christmasDay.getDay()

  if (christmasWeekday >= 1 && christmasWeekday <= 4) {
    // Christmas Mon-Thu -> Boxing Day Tue-Fri, both weekdays already.
    return [christmasDay, boxingDay]
  }
  if (christmasWeekday === 5) {
    // Christmas Friday (stays put), Boxing Day Saturday -> substitute Monday.
    return [christmasDay, addLocalDays(boxingDay, 2)]
  }
  if (christmasWeekday === 6) {
    // Christmas Saturday -> substitute Monday, Boxing Day Sunday -> substitute Tuesday.
    return [addLocalDays(christmasDay, 2), addLocalDays(boxingDay, 2)]
  }
  // Christmas Sunday -> substitute Tuesday (Monday is already Boxing Day).
  return [addLocalDays(christmasDay, 2), boxingDay]
}

function computeHolidaysForYear(year: number): Date[] {
  const easterSunday = computeEasterSunday(year)
  const goodFriday = addLocalDays(easterSunday, -2)
  const easterMonday = addLocalDays(easterSunday, 1)
  const newYearsDay = substituteIfWeekend(new Date(year, 0, 1))
  const earlyMayBankHoliday = nthWeekdayOfMonth(year, 4, 1, "first")
  const springBankHoliday = nthWeekdayOfMonth(year, 4, 1, "last")
  const summerBankHoliday = nthWeekdayOfMonth(year, 7, 1, "last")
  const [christmasDay, boxingDay] = christmasAndBoxingDay(year)

  return [
    newYearsDay,
    goodFriday,
    easterMonday,
    earlyMayBankHoliday,
    springBankHoliday,
    summerBankHoliday,
    christmasDay,
    boxingDay,
  ]
}

const holidayCache = new Map<number, Set<string>>()

function holidayKeysForYear(year: number): Set<string> {
  let cached = holidayCache.get(year)
  if (!cached) {
    cached = new Set(computeHolidaysForYear(year).map(localDateKey))
    holidayCache.set(year, cached)
  }
  return cached
}

export function isBankHoliday(date: Date): boolean {
  return holidayKeysForYear(date.getFullYear()).has(localDateKey(date))
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date) && !isBankHoliday(date)
}

export function addBusinessDays(date: Date, days: number): Date {
  let result = date
  let remaining = Math.abs(days)
  const direction = days >= 0 ? 1 : -1

  while (remaining > 0) {
    result = addLocalDays(result, direction)
    if (isBusinessDay(result)) remaining--
  }

  return result
}

export function addCalendarDays(date: Date, days: number): Date {
  return addLocalDays(date, days)
}

export function subtractDays(date: Date, days: number, type: "CALENDAR" | "BUSINESS"): Date {
  return type === "BUSINESS" ? addBusinessDays(date, -days) : addCalendarDays(date, -days)
}

export function addDays(date: Date, days: number, type: "CALENDAR" | "BUSINESS"): Date {
  return type === "BUSINESS" ? addBusinessDays(date, days) : addCalendarDays(date, days)
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function toISODateString(date: Date): string {
  return localDateKey(date)
}
