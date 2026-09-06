import { createServer } from "node:http";
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const lessonsFile = join(root, "data", "lessons_export.csv");
const tutorsFile = join(root, "data", "tutors.csv");
const lessonCoreFields = ["lesson_id", "tutor_id", "date", "start_time", "duration_min"];
const contentTypes = { ".css": "text/css", ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".csv": "text/csv", ".webmanifest": "application/manifest+json" };

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted && char === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (!quoted && char === ",") { row.push(field); field = ""; }
    else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [headers, ...records] = rows;
  headers[0] = headers[0].replace(/^\uFEFF/, "");
  return records.filter((record) => record.some(Boolean)).map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ""])));
}

function csvValue(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function readCsv(file) { return parseCsv(readFileSync(file, "utf8")); }
function writeLessons(rows) {
  const metadataFields = [...new Set(rows.flatMap((row) => Object.keys(row)).filter((field) => !lessonCoreFields.includes(field)))];
  const fields = [...lessonCoreFields, ...metadataFields];
  const output = [fields.join(","), ...rows.map((row) => fields.map((field) => csvValue(row[field])).join(","))].join("\n") + "\n";
  const temporary = `${lessonsFile}.tmp`;
  writeFileSync(temporary, output, "utf8");
  renameSync(temporary, lessonsFile);
}
function toMinutes(time) { const [hour, minute] = String(time).split(":").map(Number); return hour * 60 + minute; }
function validate(candidate) {
  for (const field of ["lesson_id", "tutor_id", "date", "start_time", "duration_min"]) if (!String(candidate[field] ?? "").trim()) return "Lesson ID, tutor, date, start time and duration are required.";
  const start = toMinutes(candidate.start_time), duration = Number(candidate.duration_min);
  if (!Number.isFinite(start) || !Number.isInteger(duration) || duration <= 0) return "Start time and duration are invalid.";
  return null;
}
function sendJson(response, status, value) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(value));
}
function readBody(request) {
  return new Promise((resolve, reject) => { let body = ""; request.on("data", (chunk) => body += chunk); request.on("end", () => { try { resolve(JSON.parse(body)); } catch { reject(new Error("Invalid JSON body.")); } }); request.on("error", reject); });
}
function serveFile(pathname, response) {
  const relative = pathname === "/" ? "index.html" : pathname.slice(1);
  const target = normalize(join(root, relative));
  if (!target.startsWith(root)) return sendJson(response, 403, { message: "Forbidden." });
  try { const content = readFileSync(target); response.writeHead(200, { "Content-Type": `${contentTypes[extname(target)] || "application/octet-stream"}; charset=utf-8` }); response.end(content); }
  catch { sendJson(response, 404, { message: "Not found." }); }
}

const server = createServer(async (request, response) => {
  const { pathname } = new URL(request.url, "http://127.0.0.1");
  if (request.method === "GET" && pathname === "/api/schedule") return sendJson(response, 200, { tutors: readCsv(tutorsFile), lessons: readCsv(lessonsFile) });
  if (request.method === "POST" && pathname === "/api/lessons") {
    try { const lesson = await readBody(request), lessons = readCsv(lessonsFile); if (lessons.some((item) => item.lesson_id === lesson.lesson_id)) return sendJson(response, 409, { message: "Lesson ID already exists." }); const issue = validate(lesson); if (issue) return sendJson(response, 409, { message: issue }); writeLessons([...lessons, lesson]); return sendJson(response, 201, lesson); }
    catch (error) { return sendJson(response, 400, { message: error.message }); }
  }
  if (request.method === "PUT" && pathname.startsWith("/api/lessons/")) {
    try { const lessonId = decodeURIComponent(pathname.slice("/api/lessons/".length)), lesson = await readBody(request), lessons = readCsv(lessonsFile), previous = lessons.find((item) => item.lesson_id === lessonId); if (!previous) return sendJson(response, 404, { message: "Lesson not found." }); lesson.lesson_id = lessonId; const issue = validate(lesson); if (issue) return sendJson(response, 409, { message: issue }); writeLessons(lessons.map((item) => item.lesson_id === lessonId ? lesson : item)); return sendJson(response, 200, lesson); }
    catch (error) { return sendJson(response, 400, { message: error.message }); }
  }
  if (request.method === "GET") return serveFile(pathname, response);
  sendJson(response, 404, { message: "Not found." });
});

server.listen(8000, "127.0.0.1", () => console.log("Schedule tool: http://127.0.0.1:8000"));
