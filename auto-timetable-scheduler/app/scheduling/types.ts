export type Course = {
  id: string;
  name: string;
  hours_per_week: number;
  faculty: string;
  room: string;
  color: string;
};

export type TimetableEntry = {
  course: string;
  faculty?: string;
  room?: string;
  day: number | string;
  slot: number;
  day_name?: string;
};

export type UnavailableRange = {
  day: number;
  start_slot: number;
  end_slot: number;
};

export type PreferredPeriod = {
  course: string;
  day: number | null;
  slot: number;
};

export type SchedulingPreferences = {
  unavailable_days: number[];
  unavailable_ranges: UnavailableRange[];
  preferred_earliest_start: number;
  preferred_latest_finish: number;
  preferred_break_slot: number | null;
  compact_days: boolean;
  minimize_gaps: boolean;
  preferred_periods: PreferredPeriod[];
};

export type ScheduleMove = {
  course: string;
  from_day: number;
  from_slot: number;
  to_day: number;
  to_slot: number;
};

export type AssistantContext = {
  courses: Pick<Course, "name" | "hours_per_week" | "faculty" | "room">[];
  timetable: TimetableEntry[];
  preferences: SchedulingPreferences;
  generationConflict: {
    message: string;
    courses: string[];
    constraints: string[];
    suggestions: string[];
  } | null;
  fitSummary: string[];
};

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export const PERIODS = [
  "09:00",
  "10:00",
  "11:15",
  "12:15",
  "14:00",
  "15:00",
];

export const DEFAULT_PREFERENCES: SchedulingPreferences = {
  unavailable_days: [],
  unavailable_ranges: [],
  preferred_earliest_start: 0,
  preferred_latest_finish: 5,
  preferred_break_slot: 3,
  compact_days: false,
  minimize_gaps: true,
  preferred_periods: [],
};

export const PREFERENCES_STORAGE_KEY = "chronos-scheduling-preferences";
export const COURSES_STORAGE_KEY = "chronos-courses";
export const TIMETABLE_STORAGE_KEY = "chronos-timetable";

export function isSchedulingPreferences(
  value: unknown
): value is SchedulingPreferences {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<SchedulingPreferences>;
  return (
    Array.isArray(candidate.unavailable_days) &&
    candidate.unavailable_days.every(
      (day) => Number.isInteger(day) && day >= 0 && day < DAYS.length
    ) &&
    Array.isArray(candidate.unavailable_ranges) &&
    candidate.unavailable_ranges.every(
      (range) =>
        typeof range === "object" &&
        range !== null &&
        Number.isInteger(range.day) &&
        range.day >= 0 &&
        range.day < DAYS.length &&
        Number.isInteger(range.start_slot) &&
        range.start_slot >= 0 &&
        range.start_slot < PERIODS.length &&
        Number.isInteger(range.end_slot) &&
        range.end_slot >= range.start_slot &&
        range.end_slot < PERIODS.length
    ) &&
    Number.isInteger(candidate.preferred_earliest_start) &&
    candidate.preferred_earliest_start! >= 0 &&
    candidate.preferred_earliest_start! < PERIODS.length &&
    Number.isInteger(candidate.preferred_latest_finish) &&
    candidate.preferred_latest_finish! >= candidate.preferred_earliest_start! &&
    candidate.preferred_latest_finish! < PERIODS.length &&
    (candidate.preferred_break_slot === null ||
      (Number.isInteger(candidate.preferred_break_slot) &&
        candidate.preferred_break_slot! >= 0 &&
        candidate.preferred_break_slot! < PERIODS.length)) &&
    typeof candidate.compact_days === "boolean" &&
    typeof candidate.minimize_gaps === "boolean" &&
    Array.isArray(candidate.preferred_periods) &&
    candidate.preferred_periods.every(
      (period) =>
        typeof period.course === "string" &&
        (period.day === null ||
          (Number.isInteger(period.day) &&
            period.day >= 0 &&
            period.day < DAYS.length)) &&
        Number.isInteger(period.slot) &&
        period.slot >= 0 &&
        period.slot < PERIODS.length
    )
  );
}
