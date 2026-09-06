"""Local server for the scheduling tool. Uses Python standard library only."""

import csv
import json
from http import HTTPStatus
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
LESSONS_FILE = DATA / "lessons_export.csv"
TUTORS_FILE = DATA / "tutors.csv"
LESSON_CORE_FIELDS = ["lesson_id", "tutor_id", "date", "start_time", "duration_min"]


def read_csv(path):
    with path.open("r", newline="", encoding="utf-8-sig") as source:
        return list(csv.DictReader(source))


def write_lessons(rows):
    metadata_fields = list(dict.fromkeys(field for row in rows for field in row if field not in LESSON_CORE_FIELDS))
    fields = LESSON_CORE_FIELDS + metadata_fields
    temporary = LESSONS_FILE.with_suffix(".tmp")
    with temporary.open("w", newline="", encoding="utf-8") as target:
        writer = csv.DictWriter(target, fieldnames=fields)
        writer.writeheader()
        writer.writerows([{field: row.get(field, "") for field in fields} for row in rows])
    temporary.replace(LESSONS_FILE)


def minutes(value):
    hour, minute = map(int, value.split(":"))
    return hour * 60 + minute


def validate(candidate):
    required = ["lesson_id", "tutor_id", "date", "start_time", "duration_min"]
    if any(not str(candidate.get(field, "")).strip() for field in required):
        return "Lesson ID, tutor, date, start time and duration are required."
    try:
        start = minutes(candidate["start_time"])
        end = start + int(candidate["duration_min"])
        if int(candidate["duration_min"]) <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return "Start time and duration are invalid."
    return None


class Handler(SimpleHTTPRequestHandler):
    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError):
            # The browser cancelled a static-file request; no server action is needed.
            pass

    def send_json(self, status, body):
        content = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def read_json(self):
        length = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def do_GET(self):
        if urlparse(self.path).path == "/api/schedule":
            return self.send_json(HTTPStatus.OK, {"tutors": read_csv(TUTORS_FILE), "lessons": read_csv(LESSONS_FILE)})
        return super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path != "/api/lessons":
            return self.send_error(HTTPStatus.NOT_FOUND)
        try:
            lesson = self.read_json()
            lessons = read_csv(LESSONS_FILE)
            if any(row["lesson_id"] == lesson.get("lesson_id") for row in lessons):
                return self.send_json(HTTPStatus.CONFLICT, {"message": "Lesson ID already exists."})
            issue = validate(lesson)
            if issue:
                return self.send_json(HTTPStatus.CONFLICT, {"message": issue})
            lessons.append(lesson)
            write_lessons(lessons)
            return self.send_json(HTTPStatus.CREATED, lesson)
        except (json.JSONDecodeError, UnicodeDecodeError):
            return self.send_json(HTTPStatus.BAD_REQUEST, {"message": "Invalid JSON body."})

    def do_PUT(self):
        lesson_id = urlparse(self.path).path.removeprefix("/api/lessons/")
        if not lesson_id or not self.path.startswith("/api/lessons/"):
            return self.send_error(HTTPStatus.NOT_FOUND)
        try:
            lesson = self.read_json()
            lessons = read_csv(LESSONS_FILE)
            previous = next((row for row in lessons if row["lesson_id"] == lesson_id), None)
            if not previous:
                return self.send_json(HTTPStatus.NOT_FOUND, {"message": "Lesson not found."})
            lesson["lesson_id"] = lesson_id
            issue = validate(lesson)
            if issue:
                return self.send_json(HTTPStatus.CONFLICT, {"message": issue})
            write_lessons([lesson if row["lesson_id"] == lesson_id else row for row in lessons])
            return self.send_json(HTTPStatus.OK, lesson)
        except (json.JSONDecodeError, UnicodeDecodeError):
            return self.send_json(HTTPStatus.BAD_REQUEST, {"message": "Invalid JSON body."})


if __name__ == "__main__":
    server = HTTPServer(("127.0.0.1", 8000), Handler)
    print("Schedule tool: http://127.0.0.1:8000")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
