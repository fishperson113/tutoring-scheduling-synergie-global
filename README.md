# Teacher Schedule

The PWA loads its initial data from the CSV files in `data/`. [`src/server/server.js`](src/server/server.js) is the default local API for reading and writing those files; it needs no database or separate backend service. [`src/server/server.py`](src/server/server.py) is an alternative. Options are centralized in [`src/config/app-config.js`](src/config/app-config.js).

## Prerequisites

- Node.js 18+ for the default server, or Python 3.10+ for the alternative server.
- A modern browser with JavaScript enabled.
- No package installation, database, or external service is required.

```powershell
npm run serve
```

Then open `http://localhost:8000`.

Creating or updating a lesson is checked for tutor and room conflicts in both the UI and local API before the CSV file is replaced. Changes persist after a page refresh.

To use Python instead of Node.js: `npm run serve:python`.

## Configuration

Edit [`src/config/app-config.js`](src/config/app-config.js) to select the data source, CSV paths, local server preference, PWA behavior, and future Firebase or remote API settings.

- `dataSource: "api"` uses the local or remote API configured by `backend.baseUrl` and saves CSV changes.
- `dataSource: "csv"` loads the CSV files directly and keeps edits only in the browser session.

## API

The local API accepts policy conflicts and leaves them for the frontend to show in Schedule checks.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/schedule` | Load tutors and lessons. |
| `POST` | `/api/lessons` | Create a lesson. |
| `PUT` | `/api/lessons/:lessonId` | Update a lesson. |

`POST /api/notifications` is intentionally not implemented. Web push needs a centralized backend, device subscriptions, and delivery infrastructure.
