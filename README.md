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
