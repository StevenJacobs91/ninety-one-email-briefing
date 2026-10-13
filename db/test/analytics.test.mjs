import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import { poolConfig } from '../lib/connect.mjs'
import { runMigrations } from '../migrate.mjs'

let c
const TEAM = '11111111-1111-1111-1111-111111111111'

before(async () => {
  c = new pg.Client(poolConfig()); await c.connect()
  await c.query('drop schema public cascade; create schema public;')
  await runMigrations(c)
  await c.query('insert into teams (id, name) values ($1, $2)', [TEAM, 'Marketing'])
})
after(async () => { await c.end() })

test('a send time event records day and hour', async () => {
  await c.query(`insert into send_time_events
    (team_id, brief_id, campaign_name, email_type, sent_at, day_of_week, hour_of_day, delivered)
    values ($1, 'b-1', 'Taking Stock', 'newsletter', now(), 2, 9, 1200)`, [TEAM])
  const { rows } = await c.query('select unique_ctr from send_time_events where brief_id = $1', ['b-1'])
  assert.equal(Number(rows[0].unique_ctr), 0)
})

test('an out-of-range hour is rejected', async () => {
  await assert.rejects(
    c.query(`insert into send_time_events
      (team_id, brief_id, campaign_name, email_type, sent_at, day_of_week, hour_of_day)
      values ($1, 'b-2', 'X', 'newsletter', now(), 2, 24)`, [TEAM]),
    /send_time_events_hour_of_day_check/)
})

test('an invalid benchmark source is rejected', async () => {
  await assert.rejects(
    c.query(`insert into benchmark_entries (team_id, label, email_category, source)
             values ($1, 'Industry', 'newsletter', 'guesswork')`, [TEAM]),
    /benchmark_entries_source_check/)
})

test('an invalid segment type is rejected', async () => {
  await assert.rejects(
    c.query(`insert into audience_health_snapshots (team_id, snapshot_date, segment_type, segment_value)
             values ($1, current_date, 'postcode', 'ZA')`, [TEAM]),
    /audience_health_snapshots_segment_type_check/)
})

test('a health snapshot accepts a valid risk level', async () => {
  await c.query(`insert into audience_health_snapshots
    (team_id, snapshot_date, segment_type, segment_value, risk_level, churn_score)
    values ($1, current_date, 'region', 'South Africa', 'high', 0.72)`, [TEAM])
  const { rows } = await c.query(`select list_size from audience_health_snapshots where segment_value = 'South Africa'`)
  assert.equal(rows[0].list_size, 0)
})

test('re-running the migrations changes nothing', async () => {
  assert.deepEqual(await runMigrations(c), [])
})
