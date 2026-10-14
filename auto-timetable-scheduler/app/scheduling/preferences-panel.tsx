"use client";

import { useState } from "react";
import { Check, Clock3, Plus, Trash2 } from "lucide-react";
import {
  DAYS,
  PERIODS,
  type Course,
  type SchedulingPreferences,
  type UnavailableRange,
} from "./types";

const fieldClass =
  "h-10 rounded-lg border border-[#e8e1d6] bg-white px-3 text-sm text-[#292823] outline-none focus:border-[#ff8a24]";
const checkboxClass =
  "h-4 w-4 rounded border-[#cfc5b5] accent-[#ff8a24] focus-visible:outline-[#ff8a24]";

export default function PreferencesPanel({
  preferences,
  courses,
  saved,
  saveError,
  onChange,
}: {
  preferences: SchedulingPreferences;
  courses: Course[];
  saved: boolean;
  saveError: string;
  onChange: (preferences: SchedulingPreferences) => void;
}) {
  const [rangeDay, setRangeDay] = useState(0);
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(0);
  const [preferredCourse, setPreferredCourse] = useState(
    courses[0]?.name ?? ""
  );
  const [preferredDay, setPreferredDay] = useState("any");
  const [preferredSlot, setPreferredSlot] = useState(0);
  const [validationMessage, setValidationMessage] = useState("");

  const update = (changes: Partial<SchedulingPreferences>) =>
    onChange({ ...preferences, ...changes });

  const addUnavailableRange = () => {
    if (rangeStart > rangeEnd) {
      setValidationMessage("Choose an end period that is not before the start.");
      return;
    }
    const candidate: UnavailableRange = {
      day: rangeDay,
      start_slot: rangeStart,
      end_slot: rangeEnd,
    };
    const duplicate = preferences.unavailable_ranges.some(
      (range) =>
        range.day === candidate.day &&
        range.start_slot === candidate.start_slot &&
        range.end_slot === candidate.end_slot
    );
    if (duplicate) {
      setValidationMessage("That unavailable range is already saved.");
      return;
    }
    update({
      unavailable_ranges: [...preferences.unavailable_ranges, candidate],
    });
    setValidationMessage("");
  };

  const addPreferredPeriod = () => {
    if (!preferredCourse) {
      setValidationMessage("Add a course before choosing a preferred period.");
      return;
    }
    const candidate = {
      course: preferredCourse,
      day: preferredDay === "any" ? null : Number(preferredDay),
      slot: preferredSlot,
    };
    if (
      preferences.preferred_periods.some(
        (period) =>
          period.course === candidate.course &&
          period.day === candidate.day &&
          period.slot === candidate.slot
      )
    ) {
      setValidationMessage("That course period preference is already saved.");
      return;
    }
    update({
      preferred_periods: [...preferences.preferred_periods, candidate],
    });
    setValidationMessage("");
  };

  return (
    <section className="dashboard-feature-card rounded-2xl border border-[#eae9e4] bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold sm:text-xl">
            My scheduling preferences
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#635d53]">
            These personal preferences are separate from course, faculty, and
            room assignments. They are saved in this browser and sent to the
            scheduler when you create a preview.
          </p>
        </div>
        <p
          className="flex items-center gap-1.5 text-xs font-medium text-[#635d53]"
          role="status"
          aria-live="polite"
        >
          <Check size={14} className={saved ? "text-[#36775c]" : "hidden"} />
          {saveError || (saved ? "Saved in this browser" : "Saving…")}
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:gap-5 xl:grid-cols-2">
        <fieldset className="preference-group min-w-0 rounded-xl border border-[#e9e1d5] bg-[#fffdf8]/75 p-5 sm:p-6">
          <legend className="px-2 text-sm font-semibold text-[#292823] sm:text-[15px]">
            Required constraints
          </legend>
          <p className="mb-4 text-[13px] leading-5 text-[#635d53]">
            Classes will never be placed on unavailable days or inside these
            unavailable time ranges.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {DAYS.map((day, index) => (
              <label
                key={day}
                className="flex min-h-10 items-center gap-2 rounded-lg border border-[#eee8de] bg-white/75 px-2.5 text-xs font-medium text-[#514c43] sm:px-3 sm:text-sm"
              >
                <input
                  type="checkbox"
                  className={checkboxClass}
                  checked={preferences.unavailable_days.includes(index)}
                  onChange={(event) =>
                    update({
                      unavailable_days: event.target.checked
                        ? [...preferences.unavailable_days, index].sort(
                            (a, b) => a - b
                          )
                        : preferences.unavailable_days.filter(
                            (item) => item !== index
                          ),
                    })
                  }
                />
                No {day}
              </label>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 items-end gap-3 sm:grid-cols-4">
            <label className="text-xs font-medium text-[#635d53]">
              Day
              <select
                className={`${fieldClass} mt-1 w-full`}
                value={rangeDay}
                onChange={(event) => setRangeDay(Number(event.target.value))}
              >
                {DAYS.map((day, index) => (
                  <option key={day} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-[#635d53]">
              From
              <select
                className={`${fieldClass} mt-1 w-full`}
                value={rangeStart}
                onChange={(event) => setRangeStart(Number(event.target.value))}
              >
                {PERIODS.map((period, index) => (
                  <option key={period} value={index}>
                    {period}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-[#635d53]">
              Through
              <select
                className={`${fieldClass} mt-1 w-full`}
                value={rangeEnd}
                onChange={(event) => setRangeEnd(Number(event.target.value))}
              >
                {PERIODS.map((period, index) => (
                  <option key={period} value={index}>
                    {period}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={addUnavailableRange}
              className="flex h-10 items-center justify-center gap-1 rounded-lg bg-[#252523] px-3 text-xs font-semibold text-white hover:bg-[#414141] focus-visible:outline-offset-2"
            >
              <Plus size={14} /> Add range
            </button>
          </div>
          {preferences.unavailable_ranges.length > 0 && (
            <ul className="mt-4 space-y-2">
              {preferences.unavailable_ranges.map((range, index) => (
                <li
                  key={`${range.day}-${range.start_slot}-${range.end_slot}`}
                  className="flex items-center justify-between gap-3 rounded-lg bg-[#f8f5ef] px-3 py-2 text-xs"
                >
                  <span>
                    {DAYS[range.day]} · {PERIODS[range.start_slot]}–
                    {PERIODS[range.end_slot]}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove unavailable range ${index + 1}`}
                    onClick={() =>
                      update({
                        unavailable_ranges:
                          preferences.unavailable_ranges.filter(
                            (_, rangeIndex) => rangeIndex !== index
                          ),
                      })
                    }
                    className="rounded p-1 text-[#635d53] hover:bg-white"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        <fieldset className="preference-group min-w-0 rounded-xl border border-[#e9e1d5] bg-[#fffdf8]/75 p-5 sm:p-6">
          <legend className="px-2 text-sm font-semibold text-[#292823] sm:text-[15px]">
            Soft preferences
          </legend>
          <p className="mb-4 text-[13px] leading-5 text-[#635d53]">
            The scheduler tries to honor these, but may vary them to keep every
            required class and hard constraint valid.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-medium text-[#635d53]">
              Earliest preferred start
              <select
                className={`${fieldClass} mt-1 w-full`}
                value={preferences.preferred_earliest_start}
                onChange={(event) =>
                  update({
                    preferred_earliest_start: Number(event.target.value),
                  })
                }
              >
                {PERIODS.map((period, index) => (
                  <option
                    key={period}
                    value={index}
                    disabled={index > preferences.preferred_latest_finish}
                  >
                    {period}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-[#635d53]">
              Latest preferred finish
              <select
                className={`${fieldClass} mt-1 w-full`}
                value={preferences.preferred_latest_finish}
                onChange={(event) =>
                  update({
                    preferred_latest_finish: Number(event.target.value),
                  })
                }
              >
                {PERIODS.map((period, index) => (
                  <option
                    key={period}
                    value={index}
                    disabled={index < preferences.preferred_earliest_start}
                  >
                    {period}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-span-2 text-xs font-medium text-[#635d53]">
              Preferred break / lunch period
              <select
                className={`${fieldClass} mt-1 w-full`}
                value={preferences.preferred_break_slot ?? "none"}
                onChange={(event) =>
                  update({
                    preferred_break_slot:
                      event.target.value === "none"
                        ? null
                        : Number(event.target.value),
                  })
                }
              >
                <option value="none">No preferred break</option>
                {PERIODS.map((period, index) => (
                  <option key={period} value={index}>
                    {period}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 space-y-3">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className={`${checkboxClass} mt-0.5`}
                checked={preferences.compact_days}
                onChange={(event) =>
                  update({ compact_days: event.target.checked })
                }
              />
              <span>
                Prefer compact days
                <span className="mt-0.5 block text-xs text-[#635d53]">
                  Try to use fewer days for classes.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className={`${checkboxClass} mt-0.5`}
                checked={preferences.minimize_gaps}
                onChange={(event) =>
                  update({ minimize_gaps: event.target.checked })
                }
              />
              <span>
                Prefer fewer gaps between classes
                <span className="mt-0.5 block text-xs text-[#635d53]">
                  The optimizer tries to make each class day more continuous.
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        <fieldset className="preference-group min-w-0 rounded-xl border border-[#e9e1d5] bg-[#fffdf8]/75 p-5 sm:col-span-2 sm:p-6">
          <legend className="px-2 text-sm font-semibold text-[#292823] sm:text-[15px]">
            Course-specific preferences
          </legend>
          <p className="mb-4 text-[13px] leading-5 text-[#635d53]">
            Add optional preferred periods for individual courses. These guide
            the schedule but never override required constraints.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="text-xs font-medium text-[#635d53]">
              Course
              <select
                className={`${fieldClass} mt-1 w-full`}
                value={preferredCourse}
                onChange={(event) => setPreferredCourse(event.target.value)}
                disabled={courses.length === 0}
              >
                {courses.map((course) => (
                  <option key={course.id} value={course.name}>
                    {course.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-[#635d53]">
              Preferred period
              <select
                className={`${fieldClass} mt-1 w-full`}
                value={preferredSlot}
                onChange={(event) => setPreferredSlot(Number(event.target.value))}
              >
                {PERIODS.map((period, index) => (
                  <option key={period} value={index}>
                    {period}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-[#635d53]">
              Day preference
              <select
                className={`${fieldClass} mt-1 w-full`}
                value={preferredDay}
                onChange={(event) => setPreferredDay(event.target.value)}
              >
                <option value="any">Any day</option>
                {DAYS.map((day, index) => (
                  <option key={day} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {courses.length === 0 && (
            <p className="mt-3 text-xs text-[#635d53]">
              Add a course before setting a course-specific preference.
            </p>
          )}
          <button
            type="button"
            onClick={addPreferredPeriod}
            disabled={courses.length === 0}
            className="mt-4 flex h-10 items-center gap-1.5 rounded-lg border border-[#e8e1d6] px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Clock3 size={14} /> Add preferred period
          </button>
          {preferences.preferred_periods.length > 0 && (
            <ul className="mt-3 space-y-2">
              {preferences.preferred_periods.map((period, index) => (
                <li
                  key={`${period.course}-${period.day}-${period.slot}`}
                  className="flex items-center justify-between gap-2 rounded-lg bg-[#f8f5ef] px-3 py-2 text-xs"
                >
                  <span>
                    {period.course} · {period.day === null ? "Any day" : DAYS[period.day]} ·{" "}
                    {PERIODS[period.slot]}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove preferred period ${index + 1}`}
                    onClick={() =>
                      update({
                        preferred_periods:
                          preferences.preferred_periods.filter(
                            (_, periodIndex) => periodIndex !== index
                          ),
                      })
                    }
                    className="rounded p-1 text-[#635d53] hover:bg-white"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </fieldset>
      </div>

      {validationMessage && (
        <p className="mt-3 text-sm text-[#9b3d20]" role="alert">
          {validationMessage}
        </p>
      )}

      <div className="mt-6 flex items-start gap-3 rounded-xl bg-[#f8f5ef] p-4">
        <Clock3 size={17} className="mt-0.5 shrink-0 text-[#76520d]" />
        <div>
          <p className="text-sm font-semibold">Class reminders</p>
          <p className="mt-1 text-xs leading-5 text-[#635d53]">
            Automatic reminders are not supported by this browser-only app yet.
            Calendar export below is available without connecting an external
            calendar account.
          </p>
        </div>
      </div>
    </section>
  );
}
