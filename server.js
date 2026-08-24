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
