import { validateLesson } from "./policies.js";

export function saveLesson(lessons, draft) {
  const issues = validateLesson(draft, lessons);
  if (issues.length) return { lessons, issues };
  const existing = lessons.find((lesson) => lesson.id === draft.id);
  const now = new Date().toISOString();
  const next = existing
    ? { ...draft, metadata: { ...draft.metadata, updatedAt: now, changeHistory: [...existing.metadata.changeHistory, { changedAt: now, summary: "Schedule updated" }] } }
    : { ...draft, metadata: { ...draft.metadata, updatedAt: now, changeHistory: [{ changedAt: now, summary: "Schedule created" }] } };
  return { lessons: existing ? lessons.map((lesson) => lesson.id === draft.id ? next : lesson) : [...lessons, next], issues: [] };
}
