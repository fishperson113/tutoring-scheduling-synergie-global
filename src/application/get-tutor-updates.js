export function getTutorUpdates(lessons, tutorId) {
  return lessons.filter((lesson) => lesson.tutorId === tutorId).sort((a, b) => (b.metadata.updatedAt || "").localeCompare(a.metadata.updatedAt || ""));
}
