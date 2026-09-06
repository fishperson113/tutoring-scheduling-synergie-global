export function issueList(issues) {
  if (!issues.length) return `<div class="clear"><strong>No conflicts found</strong><span>The current schedule is valid for tutors and rooms.</span></div>`;
  return `<ul class="issues">${issues.map((issue) => `<li><div class="issue-card"><button class="issue-button" data-focus-conflict="${issue.lessonId},${issue.relatedLessonId}"><strong>${issue.lessonId} ↔ ${issue.relatedLessonId}</strong><span>${issue.type === "tutor" ? "Tutor" : "Room"} conflict · show both lessons</span></button><button class="approve-button" data-approve-conflict="${issue.lessonId},${issue.relatedLessonId}">Approve exception</button></div></li>`).join("")}</ul>`;
}
