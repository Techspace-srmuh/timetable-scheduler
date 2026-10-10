"use client";

import { AlertTriangle, CalendarDays } from "lucide-react";
import { DAYS, type Course, type TimetableEntry } from "./types";
import { getWorkloadInsights } from "./insights";

export default function WorkloadCard({
  timetable,
  courses,
  title = "Weekly workload",
}: {
  timetable: TimetableEntry[];
  courses: Course[];
  title?: string;
}) {
  const insights = getWorkloadInsights(timetable);
  const hasSchedule = timetable.length > 0;
  const max = Math.max(...insights.byDay, 1);
  const requestedPeriods = courses.reduce(
    (total, course) => total + course.hours_per_week,
    0
  );

  return (
    <section
      aria-label={title}
      className="rounded-2xl border border-[#eae9e4] bg-white p-5 sm:p-6"
    >
      <div className="flex items-center gap-2">
        <CalendarDays size={17} className="text-[#bf5a12]" />
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="ml-auto text-xs text-[#635d53]">
          {hasSchedule
            ? `${insights.activeDays} active day${insights.activeDays === 1 ? "" : "s"}`
            : "Not generated"}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {DAYS.map((day, index) => (
          <div key={day} className="text-center">
            <div
              role="img"
              className="mx-auto flex h-16 max-w-12 items-end justify-center rounded-lg bg-[#f8f5ef] px-2"
              aria-label={
                hasSchedule
                  ? `${day}: ${insights.byDay[index]} classes`
                  : `${day}: 0 scheduled classes; timetable not generated`
              }
            >
              {hasSchedule ? (
                <span
                  className="w-full rounded-t-md bg-[#e9a45c]"
                  style={{
                    height: `${Math.max(
                      5,
                      (insights.byDay[index] / max) * 52
                    )}px`,
                  }}
                />
              ) : null}
            </div>
            <p className="mt-1.5 text-[10px] text-[#635d53]">
              {day.slice(0, 3)}
            </p>
            <p className="text-xs font-semibold">
              {insights.byDay[index]}
            </p>
          </div>
        ))}
      </div>
      {insights.suggestions.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {insights.suggestions.map((suggestion) => (
            <li
              key={suggestion}
              className="flex items-start gap-2 text-xs leading-5 text-[#514c43]"
            >
              <AlertTriangle
                size={14}
                className="mt-0.5 shrink-0 text-[#bf5a12]"
              />
              {suggestion}
            </li>
          ))}
        </ul>
      ) : timetable.length > 0 ? (
        <p className="mt-4 text-xs leading-5 text-[#635d53]">
          No unusually long days or large gaps stand out in this schedule.
        </p>
      ) : (
        <p className="mt-4 text-xs leading-5 text-[#635d53]">
          {courses.length} configured{" "}
          {courses.length === 1 ? "course" : "courses"} · {requestedPeriods}{" "}
          weekly periods requested. Generate a timetable to see how classes are
          distributed across the week.
        </p>
      )}
    </section>
  );
}
