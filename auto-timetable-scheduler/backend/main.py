from __future__ import annotations

from collections import defaultdict
from math import ceil

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator
from ortools.sat.python import cp_model


DAY_NAMES = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
]
PERIOD_LABELS = ["09:00", "10:00", "11:15", "12:15", "14:00", "15:00"]

app = FastAPI(title="Chronos Timetable API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CourseInput(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    hours_per_week: int = Field(default=3, ge=1, le=30)
    faculty: str = Field(default="Unassigned", max_length=120)
    room: str = Field(default="Room 101", max_length=120)


class UnavailableRange(BaseModel):
    day: int = Field(ge=0, le=6)
    start_slot: int = Field(ge=0, le=11)
    end_slot: int = Field(ge=0, le=11)

    @model_validator(mode="after")
    def check_range(self) -> UnavailableRange:
        if self.start_slot > self.end_slot:
            raise ValueError("Unavailable range start must be before its end.")
        return self


class PreferredPeriod(BaseModel):
    course: str = Field(min_length=1, max_length=120)
    day: int | None = Field(default=None, ge=0, le=6)
    slot: int = Field(ge=0, le=11)


class SchedulingPreferences(BaseModel):
    unavailable_days: list[int] = Field(default_factory=list, max_length=7)
    unavailable_ranges: list[UnavailableRange] = Field(
        default_factory=list, max_length=25
    )
    preferred_earliest_start: int = Field(default=0, ge=0, le=11)
    preferred_latest_finish: int = Field(default=5, ge=0, le=11)
    preferred_break_slot: int | None = Field(default=3, ge=0, le=11)
    compact_days: bool = False
    minimize_gaps: bool = True
    preferred_periods: list[PreferredPeriod] = Field(
        default_factory=list, max_length=60
    )

    @model_validator(mode="after")
    def check_preferences(self) -> SchedulingPreferences:
        if len(set(self.unavailable_days)) != len(self.unavailable_days):
            raise ValueError("Unavailable days must not be repeated.")
        if self.preferred_earliest_start > self.preferred_latest_finish:
            raise ValueError(
                "Preferred earliest start must be before latest finish."
            )
        return self


class ScheduleMove(BaseModel):
    course: str = Field(min_length=1, max_length=120)
    from_day: int = Field(ge=0, le=6)
    from_slot: int = Field(ge=0, le=11)
    to_day: int = Field(ge=0, le=6)
    to_slot: int = Field(ge=0, le=11)


class GenerateRequest(BaseModel):
    courses: list[str | CourseInput] = Field(min_length=1, max_length=60)
    days: int = Field(default=5, ge=1, le=7)
    slots_per_day: int = Field(default=6, ge=1, le=12)
    preferences: SchedulingPreferences = Field(
        default_factory=SchedulingPreferences
    )
    move: ScheduleMove | None = None

    @model_validator(mode="after")
    def validate_preference_bounds(self) -> GenerateRequest:
        preferences = self.preferences
        if any(day >= self.days for day in preferences.unavailable_days):
            raise ValueError("Unavailable days must be within the requested timetable.")
        if any(
            blocked.day >= self.days
            or blocked.end_slot >= self.slots_per_day
            for blocked in preferences.unavailable_ranges
        ):
            raise ValueError(
                "Unavailable ranges must be within the requested timetable."
            )
        if any(
            preferred.slot >= self.slots_per_day
            or (preferred.day is not None and preferred.day >= self.days)
            for preferred in preferences.preferred_periods
        ):
            raise ValueError(
                "Preferred course periods must be within the requested timetable."
            )
        return self


def _failure(message: str, courses: list[str], constraints: list[str]):
    return {
        "status": "infeasible",
        "message": message,
        "conflict": {
            "courses": courses,
            "constraints": constraints,
            "suggestions": [
                "Widen a required availability window or remove an unavailable range.",
                "Check that each course has enough weekly periods for the open slots.",
                "Review shared faculty and room assignments for courses competing at the same times.",
            ],
        },
    }


@app.get("/")
def home():
    return {"message": "Chronos scheduling engine is running"}


@app.post("/generate")
def generate_timetable(request: GenerateRequest):
    courses = []
    for item in request.courses:
        if isinstance(item, str):
            name = item.strip()
            course = CourseInput(
                name=name,
                hours_per_week=3,
                faculty=f"Faculty - {name}",
                room="Room 101",
            )
        else:
            course = item.model_copy(
                update={
                    "name": item.name.strip(),
                    "faculty": item.faculty.strip(),
                    "room": item.room.strip(),
                }
            )

        if not course.name:
            return _failure(
                "Course names cannot be empty.", [], ["Course validation"]
            )
        if not course.faculty or not course.room:
            return _failure(
                f"Add faculty and room assignments for {course.name}.",
                [course.name],
                ["Faculty and room assignments are required."],
            )
        courses.append(course)

    names = [course.name.casefold() for course in courses]
    if len(set(names)) != len(names):
        duplicates = sorted(
            {course.name for course in courses if names.count(course.name.casefold()) > 1}
        )
        return _failure(
            "Course names must be unique.",
            duplicates,
            ["Duplicate course names"],
        )

    preferences = request.preferences
    total_slots = request.days * request.slots_per_day
    total_periods = sum(course.hours_per_week for course in courses)
    all_names = [course.name for course in courses]
    if total_periods > total_slots:
        return _failure(
            f"Required periods ({total_periods}) exceed available slots ({total_slots}).",
            all_names,
            ["Weekly course periods exceed the timetable's total capacity."],
        )

    unavailable = {
        day * request.slots_per_day + slot
        for day in preferences.unavailable_days
        if day < request.days
        for slot in range(request.slots_per_day)
    }
    for blocked in preferences.unavailable_ranges:
        if blocked.day < request.days:
            unavailable.update(
                blocked.day * request.slots_per_day
                + slot
                for slot in range(
                    blocked.start_slot,
                    min(blocked.end_slot, request.slots_per_day - 1) + 1,
                )
            )

    model = cp_model.CpModel()
    assignments: dict[tuple[int, int], cp_model.IntVar] = {}
    active_days: dict[tuple[int, int], cp_model.IntVar] = {}
    objective_terms = []
    conflicts: list[str] = []
    conflicting_courses: list[str] = []

    for c, course in enumerate(courses):
        available_slots = [
            slot for slot in range(total_slots) if slot not in unavailable
        ]
        if len(available_slots) < course.hours_per_week:
            conflicting_courses.append(course.name)
            conflicts.append(
                f"{course.name} needs {course.hours_per_week} periods but only "
                f"{len(available_slots)} are available after unavailable times."
            )
        for slot in range(total_slots):
            assignments[c, slot] = model.new_bool_var(
                f"course_{c}_slot_{slot}"
            )
            if slot in unavailable:
                model.add(assignments[c, slot] == 0)

            period_of_day = slot % request.slots_per_day
            if period_of_day < preferences.preferred_earliest_start:
                objective_terms.append(assignments[c, slot] * 10)
            if period_of_day > preferences.preferred_latest_finish:
                objective_terms.append(assignments[c, slot] * 10)
            if (
                preferences.preferred_break_slot is not None
                and period_of_day == preferences.preferred_break_slot
            ):
                objective_terms.append(assignments[c, slot] * 7)

        if len(available_slots) < course.hours_per_week:
            continue

        model.add(
            sum(assignments[c, slot] for slot in range(total_slots))
            == course.hours_per_week
        )

        max_per_day = ceil(course.hours_per_week / request.days)
        for day in range(request.days):
            daily = [
                assignments[c, day * request.slots_per_day + period]
                for period in range(request.slots_per_day)
            ]
            model.add(sum(daily) <= max_per_day)
            day_used = model.new_bool_var(f"course_{c}_day_{day}")
            model.add_max_equality(day_used, daily)
            active_days[c, day] = day_used
            if preferences.compact_days:
                objective_terms.append(day_used * 4)

        matching_preferences = [
            preferred
            for preferred in preferences.preferred_periods
            if preferred.course.casefold() == course.name.casefold()
        ]
        for preferred in matching_preferences:
            candidate_days = (
                [preferred.day]
                if preferred.day is not None
                else range(request.days)
            )
            target_slots = [
                day * request.slots_per_day + preferred.slot
                for day in candidate_days
            ]
            if target_slots:
                matched = model.new_bool_var(
                    f"preferred_{c}_{preferred.day}_{preferred.slot}"
                )
                model.add_max_equality(
                    matched,
                    [assignments[c, slot] for slot in target_slots],
                )
                objective_terms.append(
                    (1 - matched) * 12
                )

    if conflicts:
        return _failure(
            "Some courses have fewer available periods than their weekly requirements.",
            conflicting_courses,
            conflicts,
        )

    for slot in range(total_slots):
        model.add(
            sum(assignments[c, slot] for c in range(len(courses))) <= 1
        )

    for resource_type in ("faculty", "room"):
        resource_groups: dict[str, list[int]] = defaultdict(list)
        for c, course in enumerate(courses):
            resource = getattr(course, resource_type).casefold()
            resource_groups[resource].append(c)
        for resource, course_indexes in resource_groups.items():
            if len(course_indexes) < 2:
                continue
            for slot in range(total_slots):
                model.add(
                    sum(assignments[c, slot] for c in course_indexes) <= 1
                )

    if preferences.minimize_gaps:
        for day in range(request.days):
            day_offset = day * request.slots_per_day
            occupied = [
                model.new_bool_var(f"occupied_day_{day}_slot_{slot}")
                for slot in range(request.slots_per_day)
            ]
            for slot, occupied_var in enumerate(occupied):
                model.add(
                    occupied_var
                    == sum(
                        assignments[c, day_offset + slot]
                        for c in range(len(courses))
                    )
                )
            for period in range(1, request.slots_per_day - 1):
                before = model.new_bool_var(f"before_gap_{day}_{period}")
                after = model.new_bool_var(f"after_gap_{day}_{period}")
                gap = model.new_bool_var(f"gap_{day}_{period}")
                model.add_max_equality(before, occupied[:period])
                model.add_max_equality(after, occupied[period + 1 :])
                model.add(gap <= before)
                model.add(gap <= after)
                model.add(gap + occupied[period] <= 1)
                model.add(gap >= before + after - occupied[period] - 1)
                objective_terms.append(gap * 6)

    if request.move:
        course_name = request.move.course
        target_index = next(
            (
                index
                for index, course in enumerate(courses)
                if course.name.casefold() == str(course_name).casefold()
            ),
            None,
        )
        if (
            target_index is None
            or request.move.from_day >= request.days
            or request.move.to_day >= request.days
            or request.move.from_slot >= request.slots_per_day
            or request.move.to_slot >= request.slots_per_day
        ):
            return _failure(
                "The requested move does not identify an available course period.",
                [str(course_name or "Selected course")],
                ["Requested move is outside the current timetable."],
            )
        source_flat_slot = (
            request.move.from_day * request.slots_per_day + request.move.from_slot
        )
        target_flat_slot = (
            request.move.to_day * request.slots_per_day + request.move.to_slot
        )
        model.add(assignments[target_index, source_flat_slot] == 0)
        model.add(assignments[target_index, target_flat_slot] == 1)

    if objective_terms:
        model.minimize(sum(objective_terms))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 10
    status = solver.solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        shared_resources = [
            f"{kind.title()} {resource} is shared by {', '.join(courses[index].name for index in indexes)}."
            for kind in ("faculty", "room")
            for resource, indexes in _resource_groups(courses, kind).items()
            if len(indexes) > 1
        ]
        diagnostic_lines = [
            "The required course periods cannot fit around the unavailable days or ranges.",
            *shared_resources,
        ]
        return _failure(
            "No timetable satisfies the hard availability, course-load, and shared-resource constraints.",
            all_names,
            diagnostic_lines,
        )

    timetable = []
    daily_counts = [0] * request.days
    preferred_hits = 0
    for c, course in enumerate(courses):
        for slot in range(total_slots):
            if not solver.value(assignments[c, slot]):
                continue
            day = slot // request.slots_per_day
            period = slot % request.slots_per_day
            daily_counts[day] += 1
            if any(
                preferred.course.casefold() == course.name.casefold()
                and preferred.slot == period
                and (preferred.day is None or preferred.day == day)
                for preferred in preferences.preferred_periods
            ):
                preferred_hits += 1
            timetable.append(
                {
                    "course": course.name,
                    "faculty": course.faculty,
                    "room": course.room,
                    "day": day,
                    "day_name": DAY_NAMES[day],
                    "slot": period,
                }
            )
    timetable.sort(key=lambda item: (item["day"], item["slot"]))

    summaries = [
        f"No classes were placed in {len(unavailable)} unavailable period(s).",
        (
            f"{preferred_hits} preferred course period(s) matched."
            if preferences.preferred_periods
            else "No course-specific preferred periods were set."
        ),
    ]
    if preferences.compact_days:
        summaries.append(
            f"Classes are spread across {sum(count > 0 for count in daily_counts)} day(s)."
        )
    if preferences.minimize_gaps:
        summaries.append("The schedule was optimized to reduce gaps between classes.")
    if preferences.preferred_break_slot is not None:
        break_hits = sum(
            item["slot"] == preferences.preferred_break_slot
            for item in timetable
        )
        summaries.append(
            f"{break_hits} class(es) fall in your preferred break period."
        )
    preferred_window_misses = sum(
        item["slot"] < preferences.preferred_earliest_start
        or item["slot"] > preferences.preferred_latest_finish
        for item in timetable
    )
    summaries.append(
        f"{preferred_window_misses} class(es) fall outside your preferred day window."
    )

    return {
        "status": "success",
        "timetable": timetable,
        "total_periods": len(timetable),
        "message": "Timetable generated successfully.",
        "fit_summary": summaries,
        "workload": {
            DAY_NAMES[index]: count for index, count in enumerate(daily_counts)
        },
    }


def _resource_groups(courses: list[CourseInput], kind: str):
    groups: dict[str, list[int]] = defaultdict(list)
    for index, course in enumerate(courses):
        groups[getattr(course, kind)].append(index)
    return groups
