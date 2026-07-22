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
