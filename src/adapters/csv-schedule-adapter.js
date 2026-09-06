import { createLesson, createTutor } from "../domain/models.js";
import { ScheduleRepository } from "../ports/schedule-repository.js";
import { config } from "../config/app-config.js";

function parseCsv(text) {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const keys = header.split(",");
  return lines.filter(Boolean).map((line) => Object.fromEntries(keys.map((key, index) => [key, line.split(",")[index] ?? ""])));
}

export class CsvScheduleAdapter extends ScheduleRepository {
  async load() {
    const [tutorsResponse, lessonsResponse] = await Promise.all([fetch(config.csv.tutorsPath), fetch(config.csv.lessonsPath)]);
    if (!tutorsResponse.ok || !lessonsResponse.ok) throw new Error("Could not read the CSV files. Run the app through an HTTP server.");
    return { tutors: parseCsv(await tutorsResponse.text()).map(createTutor), lessons: parseCsv(await lessonsResponse.text()).map(createLesson) };
  }
}
