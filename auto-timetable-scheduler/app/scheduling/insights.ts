import { DAYS, PERIODS, type TimetableEntry } from "./types";

export type WorkloadInsights = {
  byDay: number[];
  activeDays: number;
  longestDay: { day: string; count: number } | null;
  largestGap: { day: string; count: number } | null;
  uneven: boolean;
  suggestions: string[];
};

export function getWorkloadInsights(
  timetable: TimetableEntry[]
): WorkloadInsights {
  const slotsByDay = DAYS.map(() => [] as number[]);
  for (const entry of timetable) {
    const day =
      typeof entry.day === "number"
        ? entry.day >= 0 && entry.day < DAYS.length
          ? entry.day
          : entry.day - 1
        : DAYS.findIndex(
            (name) =>
              name.toLowerCase() ===
              (entry.day_name ?? String(entry.day)).toLowerCase()
          );
    if (day >= 0 && day < DAYS.length && Number.isInteger(entry.slot)) {
      slotsByDay[day].push(entry.slot);
    }
  }

  const byDay = slotsByDay.map((slots) => slots.length);
  const active = byDay
    .map((count, day) => ({ count, day }))
    .filter(({ count }) => count > 0);
  const longestDay = active.length
    ? active.reduce((longest, current) =>
        current.count > longest.count ? current : longest
      )
    : null;
  const gaps = slotsByDay
    .map((slots, day) => {
      const distinct = [...new Set(slots)].sort((a, b) => a - b);
      const count =
        distinct.length > 1
          ? distinct[distinct.length - 1] - distinct[0] + 1 - distinct.length
          : 0;
      return { day, count };
    })
    .filter(({ count }) => count > 0);
  const largestGap = gaps.length
    ? gaps.reduce((largest, current) =>
        current.count > largest.count ? current : largest
      )
    : null;
  const average = active.length
    ? active.reduce((sum, item) => sum + item.count, 0) / active.length
    : 0;
  const uneven =
    active.length > 1 &&
    Math.max(...active.map(({ count }) => count)) -
      Math.min(...active.map(({ count }) => count)) >=
      3;

  const suggestions: string[] = [];
  if (longestDay && longestDay.count >= 5) {
    suggestions.push(
      `${DAYS[longestDay.day]} is a long day (${longestDay.count} classes); consider moving one class to a lighter day.`
    );
  }
  if (largestGap && largestGap.count >= 2) {
    suggestions.push(
      `${DAYS[largestGap.day]} has ${largestGap.count} open period(s) between classes; a period preference may help tighten it.`
    );
  }
  if (uneven) {
    suggestions.push(
      `The weekly load averages ${average.toFixed(1)} classes per active day; shifting a class could balance the week.`
    );
  }

  return {
    byDay,
    activeDays: active.length,
    longestDay: longestDay
      ? { day: DAYS[longestDay.day], count: longestDay.count }
      : null,
    largestGap: largestGap
      ? { day: DAYS[largestGap.day], count: largestGap.count }
      : null,
    uneven,
    suggestions,
  };
}

function escapeIcs(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function formatIcsDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("") + "T";
}

export function createCalendarIcs(
  timetable: TimetableEntry[],
  now = new Date()
): string {
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  const toMonday = (8 - (startOfWeek.getDay() || 7)) % 7;
  startOfWeek.setDate(startOfWeek.getDate() + (toMonday || 7));
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Chronos//Student Timetable//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const entry of timetable) {
    const day =
      typeof entry.day === "number"
        ? entry.day >= 0 && entry.day < DAYS.length
          ? entry.day
          : entry.day - 1
        : DAYS.findIndex(
            (name) =>
              name.toLowerCase() ===
              (entry.day_name ?? String(entry.day)).toLowerCase()
          );
    const startTime = PERIODS[entry.slot];
    if (day < 0 || day >= DAYS.length || !startTime) continue;

    const eventDate = new Date(startOfWeek);
    eventDate.setDate(eventDate.getDate() + day);
    const [hours, minutes] = startTime.split(":").map(Number);
    eventDate.setHours(hours, minutes, 0, 0);
    const durationMinutes = entry.slot === 2 ? 60 : 60;
    const endDate = new Date(eventDate.getTime() + durationMinutes * 60_000);
    const uid = `${crypto.randomUUID()}@chronos.app`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
      `DTSTART:${formatIcsDate(eventDate)}${String(hours).padStart(2, "0")}${String(minutes).padStart(2, "0")}00`,
      `DTEND:${formatIcsDate(endDate)}${String(endDate.getHours()).padStart(2, "0")}${String(endDate.getMinutes()).padStart(2, "0")}00`,
      "RRULE:FREQ=WEEKLY",
      `SUMMARY:${escapeIcs(entry.course)}`,
      `DESCRIPTION:${escapeIcs(`${entry.faculty ?? "Faculty not set"} · ${entry.room ?? "Room not set"}`)}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
