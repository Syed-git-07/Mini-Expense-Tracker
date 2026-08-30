import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_URL = '/api'

const moneyFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
})

function today() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

function formatDate(date) {
  return dateFormatter.format(new Date(`${date}T00:00:00`))
}

async function apiRequest(path, options) {
  const response = await fetch(`${API_URL}${path}`, options)
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.errors?.join(', ') || data?.error || 'Something went wrong.')
  }

  return data
}

function ExpenseForm({ categories, onCreated }) {
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: '',
    date: today(),
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await apiRequest('/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, category: form.category || categories[0] }),
      })
      setForm((current) => ({
        ...current,
        description: '',
        amount: '',
        date: today(),
      }))
      await onCreated()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="entry-card" aria-labelledby="new-entry-title">
      <h2 id="new-entry-title" className="entry-card-title">New entry</h2>
      <form className="entry-form" onSubmit={handleSubmit}>
        <div className="field field-description">
          <label htmlFor="description">Description</label>
          <input
            id="description"
            name="description"
            type="text"
            placeholder="Coffee, rent, taxi…"
            value={form.description}
            onChange={updateField}
            maxLength="120"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="amount">Amount</label>
          <input
            id="amount"
            name="amount"
            type="number"
            placeholder="0.00"
            value={form.amount}
            onChange={updateField}
            step="0.01"
            min="0.01"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={form.category || categories[0] || ''}
            onChange={updateField}
            required
          >
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="date">Date</label>
          <input
            id="date"
            name="date"
            type="date"
            value={form.date}
            onChange={updateField}
            required
          />
        </div>

        <button className="btn-primary" type="submit" disabled={submitting || !categories.length}>
          {submitting ? 'Adding…' : 'Add entry'}
        </button>

        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    </section>
  )
}

function Summary({ summary }) {
  const categories = Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1])

  return (
    <section className="summary-strip" aria-label="Spending by category">
      {categories.length ? categories.map(([category, amount]) => (
        <div className="summary-item" key={category}>
          <span className="summary-key">{category}</span>
          <span className="summary-value">{moneyFormatter.format(amount)}</span>
        </div>
      )) : (
        <div className="summary-item">
          <span className="summary-key">No spending yet</span>
          <span className="summary-value">—</span>
        </div>
      )}
    </section>
  )
}

function Ledger({ expenses, loading, deletingId, onDelete }) {
  if (loading) {
    return <div className="empty-state" role="status">Opening the ledger…</div>
  }

  if (!expenses.length) {
    return <div className="empty-state">No matching entries. Add a new line above.</div>
  }

  return (
    <div className="ledger-body">
      {expenses.map((expense) => (
        <article className="ledger-row" key={expense.id}>
          <time className="cell-date" dateTime={expense.date}>{formatDate(expense.date)}</time>
          <div className="cell-desc">
            {expense.description}
            <span className="tag">{expense.category}</span>
          </div>
          <div className="cell-amount">{moneyFormatter.format(expense.amount)}</div>
          <button
            className="cell-del"
            type="button"
            title={`Delete ${expense.description}`}
            aria-label={`Delete ${expense.description}`}
            disabled={deletingId === expense.id}
            onClick={() => onDelete(expense)}
          >
            {deletingId === expense.id ? '…' : '×'}
          </button>
        </article>
      ))}
    </div>
  )
}

function App() {
  const [categories, setCategories] = useState([])
  const [expenses, setExpenses] = useState([])
  const [summary, setSummary] = useState({ total: 0, count: 0, byCategory: {} })
  const [filters, setFilters] = useState({ category: '', search: '' })
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const expenseQuery = useMemo(() => {
    const params = new URLSearchParams()
    if (filters.category) params.set('category', filters.category)
    if (debouncedSearch) params.set('q', debouncedSearch)
    const query = params.toString()
    return query ? `?${query}` : ''
  }, [filters.category, debouncedSearch])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(filters.search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [filters.search])

  async function loadDashboard() {
    try {
      const [expenseData, summaryData] = await Promise.all([
        apiRequest(`/expenses${expenseQuery}`),
        apiRequest('/summary'),
      ])
      setExpenses(expenseData)
      setSummary(summaryData)
      setPageError('')
    } catch (requestError) {
      setPageError(`${requestError.message} Is the server running on port 4000?`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    apiRequest('/categories')
      .then((data) => {
        if (active) setCategories(data)
      })
      .catch((requestError) => {
        if (active) setPageError(`${requestError.message} Is the server running on port 4000?`)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    Promise.all([
      apiRequest(`/expenses${expenseQuery}`),
      apiRequest('/summary'),
    ])
      .then(([expenseData, summaryData]) => {
        if (!active) return
        setExpenses(expenseData)
        setSummary(summaryData)
        setPageError('')
      })
      .catch((requestError) => {
        if (active) setPageError(`${requestError.message} Is the server running on port 4000?`)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [expenseQuery])

  async function handleDelete(expense) {
    if (!window.confirm(`Delete “${expense.description}”?`)) return
    setDeletingId(expense.id)
    try {
      await apiRequest(`/expenses/${expense.id}`, { method: 'DELETE' })
      await loadDashboard()
    } catch (requestError) {
      setPageError(requestError.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <main className="wrap">
      <header className="masthead-row">
        <div className="masthead">
          <p className="eyebrow">Personal accounts</p>
          <h1>The Ledger</h1>
          <p className="subtitle">a running account of where it went</p>
        </div>
        <div className="balance-block" aria-live="polite">
          <div className="balance-label">Total spent</div>
          <div className="balance-value">{moneyFormatter.format(summary.total)}</div>
          <div className="balance-count">
            {summary.count} {summary.count === 1 ? 'entry' : 'entries'}
          </div>
        </div>
      </header>

      <Summary summary={summary} />
      <ExpenseForm categories={categories} onCreated={() => loadDashboard()} />

      <section className="ledger-section" aria-labelledby="ledger-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Transaction history</p>
            <h2 id="ledger-title">Recent entries</h2>
          </div>
          <div className="filters" aria-label="Expense filters">
            <select
              aria-label="Filter by category"
              value={filters.category}
              onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <input
              type="search"
              aria-label="Search descriptions"
              placeholder="Search description…"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            />
          </div>
        </div>

        {pageError && (
          <div className="page-error" role="alert">
            <span>{pageError}</span>
            <button type="button" onClick={() => loadDashboard()}>Try again</button>
          </div>
        )}

        <div className="ledger-head" aria-hidden="true">
          <div>Date</div>
          <div>Description</div>
          <div className="align-right">Amount</div>
          <div></div>
        </div>
        <Ledger
          expenses={expenses}
          loading={loading}
          deletingId={deletingId}
          onDelete={handleDelete}
        />
      </section>
    </main>
  )
}

export default App
