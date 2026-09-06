import { endMinutes, isActive, toMinutes } from "./models.js";

function overlaps(a, b) {
  return toMinutes(a.startTime) < endMinutes(b) && toMinutes(b.startTime) < endMinutes(a);
}

export function validateLesson(candidate, lessons) {
  const issues = [];
  if (!candidate.tutorId || !candidate.date || !candidate.startTime || !Number.isFinite(candidate.durationMin) || candidate.durationMin <= 0) {
    return [{ type: "invalid", message: "Enter a tutor, date, start time, and valid duration." }];
  }
  if (!isActive(candidate)) return issues;
  const comparable = lessons.filter((lesson) => lesson.id !== candidate.id && isActive(lesson) && lesson.date === candidate.date && overlaps(lesson, candidate));
  for (const lesson of comparable) {
    if (lesson.tutorId === candidate.tutorId) issues.push({ type: "tutor", lessonId: lesson.id, message: `Tutor conflicts with lesson ${lesson.id}.` });
    if (lesson.metadata.room && lesson.metadata.room === candidate.metadata.room) issues.push({ type: "room", lessonId: lesson.id, message: `Room ${candidate.metadata.room} conflicts with lesson ${lesson.id}.` });
  }
  return issues;
}

export function findScheduleIssues(lessons) {
  const issues = [];
  const active = lessons.filter(isActive);
  for (let index = 0; index < active.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < active.length; otherIndex += 1) {
      const lesson = active[index];
      const other = active[otherIndex];
      if (lesson.date !== other.date || !overlaps(lesson, other)) continue;
      const resolved = lesson.metadata.conflictResolved === true && other.metadata.conflictResolved === true;
      if (lesson.tutorId === other.tutorId) issues.push({ type: "tutor", lessonId: lesson.id, relatedLessonId: other.id, resolved, message: `Tutor conflicts with lesson ${other.id}.` });
      if (lesson.metadata.room && lesson.metadata.room === other.metadata.room) issues.push({ type: "room", lessonId: lesson.id, relatedLessonId: other.id, resolved, message: `Room ${lesson.metadata.room} conflicts with lesson ${other.id}.` });
    }
  }
  return issues;
}
