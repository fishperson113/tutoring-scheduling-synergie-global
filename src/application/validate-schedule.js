import { findScheduleIssues } from "../domain/policies.js";
export function validateSchedule(lessons) { return findScheduleIssues(lessons); }
