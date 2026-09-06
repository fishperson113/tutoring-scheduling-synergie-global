const toCamel = (key) => key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
const metadataFromRow = (row, coreKeys) => Object.fromEntries(Object.entries(row).filter(([key]) => !coreKeys.includes(key)).map(([key, value]) => [toCamel(key), value || null]));

export function createTutor(row) {
  const core = ["tutor_id", "tutor_name"];
  return { id: row.tutor_id, name: row.tutor_name, metadata: metadataFromRow(row, core) };
}

export function createLesson(row) {
  const core = ["lesson_id", "tutor_id", "date", "start_time", "duration_min"];
  const metadata = metadataFromRow(row, core);
  metadata.status ||= "booked";
  metadata.conflictResolved = row.conflict_resolved === "true" ? true : row.conflict_resolved === "false" ? false : null;
  metadata.changeHistory = [];
  return { id: row.lesson_id, tutorId: row.tutor_id, date: row.date, startTime: row.start_time, durationMin: Number(row.duration_min), metadata };
}

export function isActive(lesson) {
  return lesson.metadata.status !== "cancelled";
}

export function toMinutes(time) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

export function endMinutes(lesson) {
  return toMinutes(lesson.startTime) + lesson.durationMin;
}
