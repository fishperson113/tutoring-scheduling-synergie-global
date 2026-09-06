export function tutorView(tutors, activeId) {
  return `<label class="field">Tutor<select id="tutor-filter"><option value="">All tutors</option>${tutors.map((tutor) => `<option value="${tutor.id}" ${tutor.id === activeId ? "selected" : ""}>${tutor.name} · ${tutor.metadata.subject}</option>`).join("")}</select></label>`;
}
