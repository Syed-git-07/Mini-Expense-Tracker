<<<<<<< HEAD
# Expense Tracker

A minimal full-stack expense tracker: an Express API backed by a local JSON
file, and a single-page vanilla JS/HTML/CSS frontend ("The Ledger").

## Structure
```
expense-tracker/
├── backend/
│   ├── server.js       # Express API
│   ├── package.json
│   └── data/            # auto-created, stores expenses.json
└── frontend/
    └── index.html        # open directly in a browser, or serve statically
```

## Run the backend
```bash
cd backend
npm install
npm start
```
Starts the API at `http://localhost:4000`.

## Run the frontend
Just open `frontend/index.html` in a browser (double-click, or `open index.html`).
It talks to the API at `http://localhost:4000/api` — no build step needed.

If you want to serve it instead of opening the file directly:
```bash
cd frontend
npx serve .
```

## API reference

| Method | Route              | Description                          |
|--------|---------------------|---------------------------------------|
| GET    | `/api/health`        | Health check                          |
| GET    | `/api/categories`    | List available categories             |
| GET    | `/api/expenses`      | List expenses (`?category=&from=&to=&q=`) |
| GET    | `/api/expenses/:id`  | Get one expense                       |
| POST   | `/api/expenses`      | Create expense `{description, amount, category, date}` |
| PUT    | `/api/expenses/:id`  | Update expense (partial)              |
| DELETE | `/api/expenses/:id`  | Delete expense                        |
| GET    | `/api/summary`       | Totals: overall, by category, by month |

## Notes
- Data persists to `backend/data/expenses.json` — no database setup required.
- To swap in a real database later, only `server.js`'s storage helpers
  (`readData` / `writeData`) need to change; the routes stay the same.
- CORS is open by default for local development.
=======
# Mini Expense Tracker

A single-project expense ledger built with React, Vite, and Express. The React app and API share one root package, and expenses are stored locally in `data/expenses.json` (created automatically).

## Development

Install dependencies and start the complete app from the project directory:

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`. The single command starts Vite and the API together; Vite proxies `/api` requests to `http://localhost:4000`.

## Production-style run

Build the React app, then start Express. Express serves both the API and the built frontend from the same project.

```powershell
npm run build
npm start
```

Open `http://localhost:4000`.

## Jenkins pipeline

The root `Jenkinsfile` installs dependencies, runs lint and API tests, builds the React app, and archives the `dist` directory. The Jenkins agent needs Node.js 20.19 or newer and npm available on `PATH`.

Create a Jenkins Pipeline job, select **Pipeline script from SCM**, choose this Git repository, and leave the script path as `Jenkinsfile`.
>>>>>>> 005966d (Jenkins pipeline changes)
