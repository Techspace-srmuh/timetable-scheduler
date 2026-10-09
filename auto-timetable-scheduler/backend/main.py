
from math import ceil

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from ortools.sat.python import cp_model


app = FastAPI(title="Chronos Timetable API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CourseInput(BaseModel):
    name: str
    hours_per_week: int = Field(default=3, ge=1, le=35)
    faculty: str = "Unassigned"
    room: str = "Room 101"


class GenerateRequest(BaseModel):
    courses: list[str | CourseInput]
    days: int = Field(default=5, ge=1, le=7)
    slots_per_day: int = Field(default=6, ge=1, le=12)


@app.get("/")
def home():
    return {"message": "Chronos scheduling engine is running"}


@app.post("/generate")
def generate_timetable(request: GenerateRequest):
    # Support the existing frontend, which sends course names as strings.
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
            return {
                "status": "error",
                "message": "Course names cannot be empty.",
            }

        if not course.faculty or not course.room:
            return {
                "status": "error",
                "message": f"Add faculty and room for {course.name}.",
            }

        courses.append(course)

    if not courses:
        return {
            "status": "error",
            "message": "Add at least one course.",
        }

    names = [course.name.casefold() for course in courses]

    if len(set(names)) != len(names):
        return {
            "status": "error",
            "message": "Course names must be unique.",
        }

    total_slots = request.days * request.slots_per_day

    required_periods = sum(
        course.hours_per_week for course in courses
    )

    if required_periods > total_slots:
        return {
            "status": "infeasible",
            "message": (
                f"Required periods ({required_periods}) exceed "
                f"available slots ({total_slots}). "
                "Increase the number of slots or reduce weekly hours."
            ),
        }

    model = cp_model.CpModel()
    assignments = {}

    # Each course must receive its required weekly periods.
    for c, course in enumerate(courses):
        for slot in range(total_slots):
            assignments[c, slot] = model.new_bool_var(
                f"course_{c}_slot_{slot}"
            )

        model.add(
            sum(
                assignments[c, slot]
                for slot in range(total_slots)
            ) == course.hours_per_week
        )

        # Spread lectures across days rather than packing
        # every lecture into one day.
        max_per_day = ceil(course.hours_per_week / request.days)

        for day in range(request.days):
            day_slots = [
                assignments[c, day * request.slots_per_day + s]
                for s in range(request.slots_per_day)
            ]
            model.add(sum(day_slots) <= max_per_day)

    # One lecture per time slot for this student group.
    for slot in range(total_slots):
        model.add(
            sum(
                assignments[c, slot]
                for c in range(len(courses))
            ) <= 1
        )

    # A faculty member cannot teach two courses at once.
    faculty_members = {
        course.faculty for course in courses
    }

    for faculty in faculty_members:
        faculty_courses = [
            c for c, course in enumerate(courses)
            if course.faculty == faculty
        ]

        for slot in range(total_slots):
            model.add(
                sum(
                    assignments[c, slot]
                    for c in faculty_courses
                ) <= 1
            )

    # A room cannot host two courses at once.
    rooms = {course.room for course in courses}

    for room in rooms:
        room_courses = [
            c for c, course in enumerate(courses)
            if course.room == room
        ]

        for slot in range(total_slots):
            model.add(
                sum(
                    assignments[c, slot]
                    for c in room_courses
                ) <= 1
            )

    # Prefer spreading lectures over the week.
    # Earlier slots receive a tiny preference for stable results.
    model.minimize(
        sum(
            assignments[c, slot] * (slot % request.slots_per_day)
            for c in range(len(courses))
            for slot in range(total_slots)
        )
    )

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 10
    status = solver.solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return {
            "status": "infeasible",
            "message": (
                "No valid timetable found. Check weekly hours "
                "and available slots."
            ),
        }

    day_names = [
        "Monday", "Tuesday", "Wednesday",
        "Thursday", "Friday", "Saturday", "Sunday",
    ]

    timetable = []

    for c, course in enumerate(courses):
        for slot in range(total_slots):
            if solver.value(assignments[c, slot]):
                timetable.append({
                    "course": course.name,
                    "faculty": course.faculty,
                    "room": course.room,
                    "day": slot // request.slots_per_day,
                    "day_name": day_names[
                        slot // request.slots_per_day
                    ],
                    "slot": slot % request.slots_per_day,
                })

    timetable.sort(key=lambda item: (item["day"], item["slot"]))

    return {
        "status": "success",
        "timetable": timetable,
        "total_periods": len(timetable),
        "message": "Timetable generated successfully.",
    }
