<<<<<<< HEAD
// Expense Tracker API
// Simple Express server backed by a local JSON file (no database setup required).

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 4000;
const DATA_FILE = path.join(__dirname, "data", "expenses.json");
const CATEGORIES = [
  "Food",
  "Transport",
  "Housing",
  "Utilities",
  "Health",
  "Entertainment",
  "Shopping",
  "Other",
];

app.use(cors());
app.use(express.json());

// ---------- Storage helpers ----------

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ expenses: [] }, null, 2));
  }
}

function readData() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  try {
    return JSON.parse(raw);
  } catch {
    return { expenses: [] };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function validateExpensePayload(body, { partial = false } = {}) {
  const errors = [];
  const out = {};

  if (!partial || body.amount !== undefined) {
    const amount = Number(body.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      errors.push("amount must be a positive number");
    } else {
      out.amount = Math.round(amount * 100) / 100;
    }
  }

  if (!partial || body.description !== undefined) {
    const description = String(body.description || "").trim();
    if (!description) errors.push("description is required");
    else out.description = description;
  }

  if (!partial || body.category !== undefined) {
    const category = String(body.category || "Other").trim();
    if (!CATEGORIES.includes(category)) {
      errors.push(`category must be one of: ${CATEGORIES.join(", ")}`);
    } else {
      out.category = category;
    }
  }

  if (!partial || body.date !== undefined) {
    const date = body.date ? String(body.date) : new Date().toISOString().slice(0, 10);
    if (Number.isNaN(Date.parse(date))) errors.push("date is invalid");
    else out.date = date;
  }

  return { errors, value: out };
}

// ---------- Routes ----------

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/categories", (req, res) => {
  res.json(CATEGORIES);
});

// List expenses, with optional filtering: ?category=&from=&to=&q=
app.get("/api/expenses", (req, res) => {
  const { category, from, to, q } = req.query;
  let { expenses } = readData();

  if (category) expenses = expenses.filter((e) => e.category === category);
  if (from) expenses = expenses.filter((e) => e.date >= from);
  if (to) expenses = expenses.filter((e) => e.date <= to);
  if (q) {
    const needle = String(q).toLowerCase();
    expenses = expenses.filter((e) => e.description.toLowerCase().includes(needle));
  }

  expenses = [...expenses].sort((a, b) => (a.date < b.date ? 1 : -1));
  res.json(expenses);
});

app.get("/api/expenses/:id", (req, res) => {
  const { expenses } = readData();
  const expense = expenses.find((e) => e.id === req.params.id);
  if (!expense) return res.status(404).json({ error: "Expense not found" });
  res.json(expense);
});

app.post("/api/expenses", (req, res) => {
  const { errors, value } = validateExpensePayload(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const data = readData();
  const expense = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...value,
  };
  data.expenses.push(expense);
  writeData(data);
  res.status(201).json(expense);
});

app.put("/api/expenses/:id", (req, res) => {
  const { errors, value } = validateExpensePayload(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ errors });

  const data = readData();
  const idx = data.expenses.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Expense not found" });

  data.expenses[idx] = { ...data.expenses[idx], ...value };
  writeData(data);
  res.json(data.expenses[idx]);
});

app.delete("/api/expenses/:id", (req, res) => {
  const data = readData();
  const idx = data.expenses.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Expense not found" });

  const [removed] = data.expenses.splice(idx, 1);
  writeData(data);
  res.json(removed);
});

// Summary: totals by category + overall total + monthly breakdown
app.get("/api/summary", (req, res) => {
  const { expenses } = readData();

  const totalsByCategory = {};
  const totalsByMonth = {};
  let total = 0;

  for (const e of expenses) {
    total += e.amount;
    totalsByCategory[e.category] = (totalsByCategory[e.category] || 0) + e.amount;
    const month = e.date.slice(0, 7); // YYYY-MM
    totalsByMonth[month] = (totalsByMonth[month] || 0) + e.amount;
  }

  res.json({
    total: Math.round(total * 100) / 100,
    count: expenses.length,
    byCategory: totalsByCategory,
    byMonth: totalsByMonth,
  });
});

app.use((req, res) => res.status(404).json({ error: "Not found" }));

app.listen(PORT, () => {
  console.log(`Expense Tracker API running at http://localhost:${PORT}`);
});
=======
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import express from 'express'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = Number(process.env.PORT) || 4000
const CATEGORIES = [
  'Food',
  'Housing',
  'Transport',
  'Utilities',
  'Health',
  'Entertainment',
  'Shopping',
  'Other',
]
const DATA_DIRECTORY = path.join(__dirname, 'data')
const DATA_FILE = path.join(DATA_DIRECTORY, 'expenses.json')
const CLIENT_DIST = path.join(__dirname, 'dist')

let writeQueue = Promise.resolve()

app.disable('x-powered-by')
app.use(cors())
app.use(express.json({ limit: '20kb' }))

async function ensureStore() {
  await fs.mkdir(DATA_DIRECTORY, { recursive: true })
  try {
    await fs.access(DATA_FILE)
  } catch {
    await fs.writeFile(DATA_FILE, '[]\n', 'utf8')
  }
}

async function readExpenses() {
  await ensureStore()
  const content = await fs.readFile(DATA_FILE, 'utf8')

  try {
    const expenses = JSON.parse(content)
    return Array.isArray(expenses) ? expenses : []
  } catch {
    throw new Error('The expense data file is not valid JSON.')
  }
}

function updateExpenses(updater) {
  const operation = writeQueue.then(async () => {
    const expenses = await readExpenses()
    const result = await updater(expenses)
    const temporaryFile = `${DATA_FILE}.tmp`
    await fs.writeFile(temporaryFile, `${JSON.stringify(expenses, null, 2)}\n`, 'utf8')
    await fs.rename(temporaryFile, DATA_FILE)
    return result
  })

  writeQueue = operation.catch(() => {})
  return operation
}

function localDate() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

function validateExpense(body) {
  const errors = []
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const amount = Number(body.amount)
  const category = typeof body.category === 'string' ? body.category : ''
  const date = body.date === undefined || body.date === ''
    ? localDate()
    : typeof body.date === 'string' ? body.date : ''
  const parsedDate = new Date(`${date}T00:00:00Z`)

  if (!description) errors.push('Description is required.')
  if (description.length > 120) errors.push('Description must be 120 characters or fewer.')
  if (!Number.isFinite(amount) || amount <= 0) errors.push('Amount must be greater than zero.')
  if (!CATEGORIES.includes(category)) errors.push('Choose a valid category.')
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
    || Number.isNaN(parsedDate.getTime())
    || parsedDate.toISOString().slice(0, 10) !== date
  ) {
    errors.push('Choose a valid date.')
  }

  return {
    errors,
    expense: {
      description,
      amount: Math.round(amount * 100) / 100,
      category,
      date,
    },
  }
}

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' })
})

app.get('/api/categories', (_request, response) => {
  response.json(CATEGORIES)
})

app.get('/api/expenses', async (request, response, next) => {
  try {
    const category = typeof request.query.category === 'string' ? request.query.category : ''
    const search = typeof request.query.q === 'string' ? request.query.q.trim().toLowerCase() : ''
    let expenses = await readExpenses()

    if (category) expenses = expenses.filter((expense) => expense.category === category)
    if (search) {
      expenses = expenses.filter((expense) => expense.description.toLowerCase().includes(search))
    }

    expenses.sort((first, second) => (
      second.date.localeCompare(first.date) || second.createdAt.localeCompare(first.createdAt)
    ))
    response.json(expenses)
  } catch (error) {
    next(error)
  }
})

app.get('/api/summary', async (_request, response, next) => {
  try {
    const expenses = await readExpenses()
    const summary = expenses.reduce((result, expense) => {
      result.total += expense.amount
      result.byCategory[expense.category] = (result.byCategory[expense.category] || 0) + expense.amount
      return result
    }, { total: 0, count: expenses.length, byCategory: {} })

    summary.total = Math.round(summary.total * 100) / 100
    for (const category of Object.keys(summary.byCategory)) {
      summary.byCategory[category] = Math.round(summary.byCategory[category] * 100) / 100
    }
    response.json(summary)
  } catch (error) {
    next(error)
  }
})

app.post('/api/expenses', async (request, response, next) => {
  const { errors, expense } = validateExpense(request.body || {})
  if (errors.length) return response.status(400).json({ errors })

  try {
    const created = {
      id: crypto.randomUUID(),
      ...expense,
      createdAt: new Date().toISOString(),
    }
    await updateExpenses((expenses) => expenses.push(created))
    return response.status(201).json(created)
  } catch (error) {
    return next(error)
  }
})

app.delete('/api/expenses/:id', async (request, response, next) => {
  try {
    const deleted = await updateExpenses((expenses) => {
      const index = expenses.findIndex((expense) => expense.id === request.params.id)
      if (index === -1) return null
      return expenses.splice(index, 1)[0]
    })

    if (!deleted) return response.status(404).json({ error: 'Expense not found.' })
    return response.status(204).end()
  } catch (error) {
    return next(error)
  }
})

app.use('/api', (_request, response) => {
  response.status(404).json({ error: 'API route not found.' })
})

app.use(express.static(CLIENT_DIST))

app.use((request, response, next) => {
  if (request.method === 'GET' && request.accepts('html')) {
    return response.sendFile(path.join(CLIENT_DIST, 'index.html'), (error) => {
      if (error) next()
    })
  }
  return next()
})

app.use((error, _request, response, _next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return response.status(400).json({ error: 'Request body must be valid JSON.' })
  }

  console.error(error)
  return response.status(500).json({ error: 'The server could not complete the request.' })
})

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  ensureStore()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Ledger server listening at http://localhost:${PORT}`)
      })
    })
    .catch((error) => {
      console.error('Unable to initialize expense storage:', error)
      process.exitCode = 1
    })
}

export default app
>>>>>>> 005966d (Jenkins pipeline changes)
