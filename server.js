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
