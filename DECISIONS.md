# Decisions

## Delivery note

Work ran from 16:30 to 19:15. Codex Luna (low) was used to analyse the brief and policy checks, then record the technical decisions below. The main implementation used Codex Terra (medium). Time beyond the exercise box went into UI/UX verification and small refinements: the final two technical decisions, CSV export, responsive layout alignment, and proof-reading this document.

For setup, run commands, and the API contract, see [README.md](README.md).

## 1. Pain points from the three user stories

### Owner

Duplicate bookings have happened before. This is unacceptable because a tutor, room, or student can be scheduled twice.

The system must make booking conflicts difficult to create or miss.

### Receptionist

Room and schedule arrangements need to stay flexible. A room can change per lesson and should not be restricted by an overly rigid schema.

### Tutor

Tutors receive repeated update messages and must work out which schedule is current. This is inconvenient and risks using an old schedule.

Tutors need one place that always shows the latest schedule.

## 2. Priorities and features

### Owner

- Prevent duplicate bookings.
- Detect tutor and room schedule conflicts.
- Clearly warn about invalid bookings before and after saving.

**Technical decision — non-blocking policy evaluation:** application-layer checks use time-range overlap logic for the same tutor or room. They create visible review items rather than blocking a receptionist from saving a record.

### Receptionist

- Assign rooms flexibly.
- Edit or move a booking.
- Support different room types and lesson metadata.

Keep primary keys, foreign keys, time, and other important fields explicit. Store changing metadata in a dictionary/JSON and read it by key rather than adding a column for every new case.

### Tutor

- View the latest version of a personal schedule.
- See when a lesson changed.
- View lesson change history.
- Receive a web push notification when a schedule changes.

Use `updatedAt` or `lastModified` to identify the latest version and preserve change history. Web push requires a service worker and device subscriptions.

### Shared priorities

1. **Schedule validation:** policy checks expose conflicts while the flexible model supports real scheduling work.
2. **Schedule updates:** change tracking identifies the current schedule and web push can notify tutors.

## 3. Data model

Only two main data groups are needed:

```text
tutors 1 ──── * lessons
```

### `tutors`

Source of truth:

```text
tutor_id
tutor_name
```

Additional information is stored as metadata:

```json
{ "subject": "English", "phone": "090xxx3344" }
```

### `lessons`

Source of truth:

```text
lesson_id
tutor_id
date
start_time
duration_min
```

**Technical decision — stable core fields:** these fields remain explicit because they identify a lesson, express the tutor relationship, and support time-range policy checks.

Other fields are stored as metadata:

```json
{
  "student": "Le Minh Chau",
  "room": "R1",
  "status": "booked",
  "cancelled_at": null,
  "note": null,
  "change_history": []
}
```

Policies read keys such as `room` and `status` from metadata.

**Technical decision — metadata dictionary:** all non-core CSV fields are mapped dynamically into the lesson metadata dictionary. The server and export flow preserve unknown metadata fields instead of maintaining a fixed schema for them. Policies and UI may read known keys such as `room`, `status`, `note`, and `conflictResolved` when needed.

**Technical decision — export extension:** the original front-desk CSV is accepted unchanged and is not repaired. When the tool saves or exports a lesson, it may add the optional `conflict_resolved` metadata column to record a human-approved exception. This preserves the one-row-per-lesson structure, every original identifier, and every original source field; it does not reinterpret or remove the source data.

This model fits the current CSV files, supports easy CSV/Excel export, keeps relationship and conflict fields explicit, and leaves changing business fields extensible. A frequently queried metadata key can later be promoted to a column.

## 4. Technology and implementation

### Business logic of Bright Path Learning Centre

- The centre teaches Tuesday to Sunday and is closed on Monday. See policy check **(2)**.
- A tutor may have no more than six bookings in one day. See policy check **(2)**.
- A family may cancel free of charge up to four hours before a lesson. A late cancellation still pays the tutor but frees the room and slot; a no-show frees neither. See policy check **(3)**.
- Tomorrow's schedule is final at 16:00. Changes after that time must remain visible as changes. See policy check **(3)**.
- The centre has six rooms. One room holds one lesson at a time, and a tutor can only be in one room at a time. See policy check **(1)**.
- Exam-pair bookings may be deliberately approved as an exception. They remain policy conflicts for audit but can be resolved by a human. See policy check **(4)**.

### Policy checks

- **(1)** Flag tutor overlaps and room overlaps for the same time range.
- **(2)** Flag lessons outside opening days and tutor loads above the daily limit when those checks are implemented.
- **(3)** Keep cancellation, no-show, and cut-off changes auditable.
- **(4)** **Technical decision — detect, do not block:** record creation and editing always proceed when core data is valid. Policy conflicts appear in Schedule checks for human review.
- **Technical decision — pair resolution:** `Approve exception` resolves both records in a conflict pair by writing `conflict_resolved: true`. A resolved pair is removed from Schedule checks and red highlighting, while the policy conflict remains in Conflicts only for audit.
- **Technical decision — no revert flow:** resolution is final in the current scope; it cannot be changed from `true` back to `false` through the UI.
- The system evaluates the centre's policies; a human can deliberately approve an exception and records that decision rather than hiding the underlying conflict.

### Current stack

- Plain HTML, CSS, and JavaScript.
- CSV exports from Excel as initial data.
- A PWA for installation as an internal tool.
- A small local HTTP server writes CSV changes directly; no database or separate backend service is required.

### Flow

```text
CSV files / API
→ Data access interface
→ Mapping and policy checks
→ Schedule state
→ UI
```

The UI does not depend directly on CSV access. Mapping, conflict detection, and policies work with the common model. This allows `CsvScheduleAdapter` to be replaced by `FirebaseScheduleAdapter` or `ApiScheduleAdapter` without rewriting policies or UI.

### Future options

- Firebase can become a lightweight centralized backend.
- Firebase Cloud Messaging and a service worker can provide web push notifications.
- A dedicated backend can be added for multi-tenant use or simultaneous clients.

The current priority is an incremental move away from Excel: preserve the familiar workflow, solve scheduling pain points first, and keep the code modular.

## 5. Architecture

**Hexagonal Architecture**

**Technical decision — why Hexagonal:** it keeps UI and policy logic independent from CSV, local API, or future Firebase adapters, so the data source can change without rewriting the scheduling core.

```text
project/
├── index.html
├── README.md
├── package.json
│
├── data/
│   ├── lessons_export.csv
│   └── tutors.csv
│
├── public/
│   ├── manifest.webmanifest
│   └── service-worker.js
│
└── src/
    ├── main.js
    │
    ├── server/
    │   ├── server.js
    │   └── server.py
    │
    ├── config/
    │   └── app-config.js
    │
    ├── domain/
    │   ├── models.js
    │   ├── policies.js
    │   └── schedule-service.js
    │
    ├── ports/
    │   ├── schedule-repository.js
    │   └── notification-service.js
    │
    ├── adapters/
    │   ├── csv-schedule-adapter.js
    │   ├── firebase-schedule-adapter.js
    │   ├── api-schedule-adapter.js
    │   └── web-push-notification-adapter.js
    │
    ├── application/
    │   ├── load-schedule.js
    │   ├── validate-schedule.js
    │   └── get-tutor-updates.js
    │
    ├── ui/
    │   ├── app.js
    │   ├── schedule-view.js
    │   ├── issue-list.js
    │   └── tutor-view.js
    │
    └── styles/
        └── main.css
```

### `src/config/app-config.js`

This file centralizes runtime options so configuration can change without editing the entry point or adapters.

- Select `dataSource`: `csv`, `firebase`, or `api`.
- Configure CSV paths, Firebase settings, and `backend.baseUrl`.
- Enable or disable PWA, web push, and session-only edits.

`src/main.js` is the browser entry point: it reads config, selects an adapter, and starts the UI.

### `src/server/server.js` and `src/server/server.py`

These local HTTP servers serve the frontend and a minimal CRUD API that reads and writes `data/lessons_export.csv`. No database or separate backend service is required. `server.js` is the default JavaScript option; `server.py` is the Python alternative. Both accept valid records without blocking policy conflicts; the UI evaluates and presents those conflicts for human review.

## 6. Reflection

- **Next:** add tutor web push after introducing centralized storage, device subscriptions, and a delivery service.
- **Known weakness:** CSV is not suitable for simultaneous receptionists. Opening-day, tutor-load, cancellation, and cut-off checks are documented but not yet fully implemented.
- **Delete disclaimer:** no delete endpoint was included because the soft-delete requirement was not specified in the initial decisions used for implementation. A future delete flow should retain the record and add soft-delete metadata rather than removing it permanently.
- **Rejected approach:** hard-block every conflict. This would prevent deliberate exam-pair bookings, so the tool detects conflicts and records a human-approved exception instead.
- **AI use:** Luna supported policy analysis and technical decisions; Terra supported the main implementation.
