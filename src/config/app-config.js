export const config = {
  app: {
    // Browser tab title.
    name: "Teacher Schedule",
  },

  // Options: "csv", "firebase", or "api". Implemented: "csv" and "api".
  // Use "csv" for read-only files. Use "api" to save through a local or remote backend.
  dataSource: "api",

  csv: {
    // Relative paths used when dataSource is "csv".
    tutorsPath: "./data/tutors.csv",
    lessonsPath: "./data/lessons_export.csv",
  },

  firebase: {
    // Add Firebase client settings here when the Firebase adapter is implemented.
    config: null,
  },

  backend: {
    // API base URL. Use "./api" for this local server.
    // For a remote backend, use a full URL, e.g. "https://schedule.example.com/api".
    baseUrl: "./api",
    // Expected API: GET /schedule, POST /lessons, PUT /lessons/:lessonId.
    // A remote server must allow CORS when it is hosted on another origin.
    // Local server preference: "node" or "python". Use package scripts to run it.
    runtime: "node",
  },

  features: {
    // true registers the service worker for offline caching.
    pwa: true,
    // Keep false until a push server and subscriptions are available.
    webPushNotifications: false,
    // false saves edits to CSV through the local API server.
    sessionOnlyEdits: false,
  },
};
