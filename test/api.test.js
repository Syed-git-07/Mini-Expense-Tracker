import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import app from '../server.js'

let server
let baseUrl

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`
      resolve()
    })
  })
})

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve())
  })
})

test('health endpoint reports that the API is ready', async () => {
  const response = await fetch(`${baseUrl}/api/health`)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { status: 'ok' })
})

test('expense lifecycle creates, finds, summarizes, and deletes an entry', async () => {
  const marker = `Jenkins smoke test ${Date.now()}`
  const createResponse = await fetch(`${baseUrl}/api/expenses`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      description: marker,
      amount: 17.25,
      category: 'Other',
      date: '2026-08-19',
    }),
  })

  assert.equal(createResponse.status, 201)
  const created = await createResponse.json()

  try {
    const filteredResponse = await fetch(
      `${baseUrl}/api/expenses?category=Other&q=${encodeURIComponent(marker)}`,
    )
    assert.equal(filteredResponse.status, 200)
    const filtered = await filteredResponse.json()
    assert.equal(filtered.length, 1)
    assert.equal(filtered[0].id, created.id)

    const summaryResponse = await fetch(`${baseUrl}/api/summary`)
    assert.equal(summaryResponse.status, 200)
    const summary = await summaryResponse.json()
    assert.ok(summary.count >= 1)
    assert.ok(summary.total >= 17.25)
  } finally {
    const deleteResponse = await fetch(`${baseUrl}/api/expenses/${created.id}`, {
      method: 'DELETE',
    })
    assert.equal(deleteResponse.status, 204)
  }
})

test('invalid expenses are rejected', async () => {
  const response = await fetch(`${baseUrl}/api/expenses`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      description: '',
      amount: -1,
      category: 'Unknown',
      date: '2026-02-31',
    }),
  })

  assert.equal(response.status, 400)
  const result = await response.json()
  assert.ok(Array.isArray(result.errors))
  assert.ok(result.errors.length >= 4)
})
