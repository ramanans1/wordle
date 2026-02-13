export function dateString(date) {
  return formatDate(date, "yyyy-MM-dd");
}

export function formattedDateWithOrdinal(date) {
  const day = date.getDate();
  const month = formatDate(date, "MMMM");
  const tens = Math.floor((day % 100) / 10);
  let suffix = "th";
  if (tens !== 1) {
    switch (day % 10) {
      case 1:
        suffix = "st";
        break;
      case 2:
        suffix = "nd";
        break;
      case 3:
        suffix = "rd";
        break;
      default:
        suffix = "th";
    }
  }
  return `${day}${suffix} of ${month}`;
}

export function formatDate(date, format) {
  if (format === "yyyy-MM-dd") {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  if (format === "MMMM") {
    return date.toLocaleString("en-US", { month: "long" });
  }

  if (format === "LLLL yyyy") {
    return date.toLocaleString("en-US", { month: "long", year: "numeric" });
  }

  return date.toLocaleDateString("en-US");
}

export function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function yearMonthTitle(yearMonth) {
  const date = new Date(yearMonth.year, yearMonth.month - 1, 1);
  return formatDate(date, "LLLL yyyy");
}

export function yearMonthFirstDate(yearMonth) {
  return new Date(yearMonth.year, yearMonth.month - 1, 1);
}

export function yearMonthPrevious(yearMonth) {
  const date = new Date(yearMonth.year, yearMonth.month - 1, 1);
  date.setMonth(date.getMonth() - 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function yearMonthNext(yearMonth) {
  const date = new Date(yearMonth.year, yearMonth.month - 1, 1);
  date.setMonth(date.getMonth() + 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function yearMonthGridDates(yearMonth) {
  const firstDate = yearMonthFirstDate(yearMonth);
  const startWeekday = firstDate.getDay();
  const year = yearMonth.year;
  const monthIndex = yearMonth.month - 1;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const lead = Array.from({ length: startWeekday }, () => null);
  const days = Array.from({ length: daysInMonth }, (_, idx) => new Date(year, monthIndex, idx + 1));
  return [...lead, ...days];
}
