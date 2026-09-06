import { createLesson, createTutor } from "../domain/models.js";
import { ScheduleRepository } from "../ports/schedule-repository.js";
import { config } from "../config/app-config.js";

const toSnake = (key) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

function lessonPayload(lesson) {
  const metadata = Object.fromEntries(Object.entries(lesson.metadata).filter(([key]) => !["changeHistory", "updatedAt"].includes(key)).map(([key, value]) => [toSnake(key), value === true ? "true" : value === false ? "false" : value ?? ""]));
  return {
    lesson_id: lesson.id, tutor_id: lesson.tutorId, date: lesson.date,
    start_time: lesson.startTime, duration_min: lesson.durationMin,
    ...metadata,
  };
}

export class ApiScheduleAdapter extends ScheduleRepository {
  async load() {
    const response = await fetch(`${config.backend.baseUrl}/schedule`);
    if (!response.ok) throw new Error("Could not load schedule from the local server.");
    const data = await response.json();
    return { tutors: data.tutors.map(createTutor), lessons: data.lessons.map(createLesson) };
  }

  async save(lesson, isNew) {
    const url = isNew ? `${config.backend.baseUrl}/lessons` : `${config.backend.baseUrl}/lessons/${encodeURIComponent(lesson.id)}`;
    const response = await fetch(url, { method: isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lessonPayload(lesson)) });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || "Could not save the lesson.");
    }
    return createLesson(await response.json());
  }
}
