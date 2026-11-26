import { describe, expect, it } from 'vitest'
import { handleBusy } from '../../src/worker/api'
import { buildMock } from '../../src/worker/mock'
import { BUSY_KEY } from '../../src/worker/store'
import type { StoredBusy } from '../../src/worker/store'
import { publicLimit } from '../../src/lib/busy'
import { jst } from '../helpers'
import { readBody } from './read-body'

const NOW = jst('2026-11-26 14:20') // 木曜

// KV は get(key, 'json') だけ使う
function fakeEnv(stored?: unknown, extra: Partial<Env> = {}): Env {
  const kv = {
    get: async (key: string, type?: string) => {
      if (key !== BUSY_KEY || type !== 'json')
        throw new Error('unexpected KV read')
      return stored ?? null
    },
  }
  return {
    BUSY_KV: kv as unknown as KVNamespace,
    ASSETS: {} as Fetcher,
    TIMEZONE: 'Asia/Tokyo',
    ...extra,
  }
}

const request = (query: string) =>
  new Request(`https://calendar.onnenai.cc/api/busy${query}`)

const sample: StoredBusy = {
  generatedAt: jst('2026-11-26 14:15'),
  busy: [
    [jst('2026-11-25 09:00'), jst('2026-11-25 10:00')], // 昨日（過去）
    [jst('2026-11-25 23:00'), jst('2026-11-26 01:00')], // 昨日から今日にまたぐ
    [jst('2026-11-26 09:00'), jst('2026-11-26 10:30')],
    [jst('2026-11-29 22:00'), jst('2026-11-30 02:00')], // 日曜から来週にまたぐ
    [jst('2026-12-04 09:00'), jst('2026-12-04 10:00')], // 来週
    [jst('2026-12-09 23:00'), jst('2026-12-10 01:00')], // 公開上限をまたぐ
    [jst('2026-12-12 09:00'), jst('2026-12-12 10:00')], // 上限の外
  ],
}

describe('week の検証', () => {
  it.each([
    '',
    '?week=',
    '?week=2',
    '?week=-1',
    '?week=abc',
    '?week=00',
    '?week=01',
    '?week=%200',
    '?week=0.0',
    '?week=1e0',
    '?week=0&week=1',
    '?week=0&week=0',
    '?weeks=0',
  ])('%s → 400', async (query) => {
    const res = await handleBusy(request(query), fakeEnv(sample), NOW)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'bad_request' })
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it.each(['?week=0', '?week=1'])('%s → 200', async (query) => {
    const res = await handleBusy(request(query), fakeEnv(sample), NOW)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('application/json')
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=60')
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex')
  })

  it('他のパラメータを足しても範囲は広がらない', async () => {
    const res = await handleBusy(
      request('?week=1&days=60&start=2026-01-01&end=2027-12-31'),
      fakeEnv(sample),
      NOW,
    )
    const body = await readBody(res)
    expect(body.range).toEqual({
      start: '2026-11-30T00:00:00+09:00',
      end: '2026-12-07T00:00:00+09:00',
    })
  })
})

describe('範囲（W ∩ L）', () => {
  it('week=0: 今日 0:00〜日曜まで。過去は返さず、またぐ区間は切る', async () => {
    const res = await handleBusy(request('?week=0'), fakeEnv(sample), NOW)
    expect(await res.json()).toEqual({
      timezone: 'Asia/Tokyo',
      generatedAt: '2026-11-26T14:15:00+09:00',
      range: {
        start: '2026-11-26T00:00:00+09:00',
        end: '2026-11-30T00:00:00+09:00',
      },
      busy: [
        {
          start: '2026-11-26T00:00:00+09:00',
          end: '2026-11-26T01:00:00+09:00',
        },
        {
          start: '2026-11-26T09:00:00+09:00',
          end: '2026-11-26T10:30:00+09:00',
        },
        {
          start: '2026-11-29T22:00:00+09:00',
          end: '2026-11-30T00:00:00+09:00',
        },
      ],
    })
  })

  it('week=1: 来週の月〜日', async () => {
    const res = await handleBusy(request('?week=1'), fakeEnv(sample), NOW)
    const body = await readBody(res)
    expect(body.busy).toEqual([
      { start: '2026-11-30T00:00:00+09:00', end: '2026-11-30T02:00:00+09:00' },
      { start: '2026-12-04T09:00:00+09:00', end: '2026-12-04T10:00:00+09:00' },
    ])
  })

  it('返る区間は常に公開上限 L の中（日時を変えて確認）', async () => {
    const wide: StoredBusy = {
      generatedAt: NOW,
      busy: [[jst('2026-01-01'), jst('2027-12-31')]],
    }
    for (
      let t = jst('2026-11-23');
      t < jst('2026-12-07');
      t += 5 * 3_600_000 + 7 * 60_000
    ) {
      const [ls, le] = publicLimit(t)
      for (const q of ['?week=0', '?week=1']) {
        const body = await readBody(
          await handleBusy(request(q), fakeEnv(wide), t),
        )
        for (const { start, end } of body.busy) {
          expect(Date.parse(start)).toBeGreaterThanOrEqual(ls)
          expect(Date.parse(end)).toBeLessThanOrEqual(le)
        }
        expect(Date.parse(body.range.start)).toBeGreaterThanOrEqual(ls)
        expect(Date.parse(body.range.end)).toBeLessThanOrEqual(le)
      }
    }
  })
})

describe('KV が空・壊れている', () => {
  it.each([
    ['空', undefined],
    ['形が違う', { generatedAt: 'x', busy: [] }],
    ['区間が壊れている', { generatedAt: 1, busy: [[1]] }],
  ])('%s → 503', async (_label, stored) => {
    const res = await handleBusy(request('?week=0'), fakeEnv(stored), NOW)
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: 'unavailable' })
  })
})

describe('MOCK=1', () => {
  it('KV を読まずに fixture を返す', async () => {
    const env = fakeEnv(undefined, { MOCK: '1' })
    env.BUSY_KV = {
      get: () => {
        throw new Error('MOCK なのに KV を読んだ')
      },
    } as unknown as KVNamespace
    const res = await handleBusy(request('?week=0'), env, NOW)
    expect(res.status).toBe(200)
  })

  it('MOCK が "1" 以外なら KV を読む', async () => {
    const res = await handleBusy(
      request('?week=0'),
      fakeEnv(undefined, { MOCK: 'true' }),
      NOW,
    )
    expect(res.status).toBe(503)
  })

  it('今日 = たたき台の水曜。丸め・マージ済みで Figma と同じ区間になる', async () => {
    const res = await handleBusy(
      request('?week=0'),
      fakeEnv(undefined, { MOCK: '1' }),
      NOW,
    )
    const body = await readBody(res)
    expect(body.generatedAt).toBe('2026-11-26T14:15:00+09:00')
    expect(body.busy).toEqual([
      // 今日（たたき台の水曜）
      { start: '2026-11-26T09:00:00+09:00', end: '2026-11-26T10:30:00+09:00' },
      { start: '2026-11-26T13:00:00+09:00', end: '2026-11-26T14:30:00+09:00' },
      { start: '2026-11-26T19:00:00+09:00', end: '2026-11-26T21:00:00+09:00' },
      // +1（木）
      { start: '2026-11-27T10:00:00+09:00', end: '2026-11-27T12:00:00+09:00' },
      { start: '2026-11-27T16:30:00+09:00', end: '2026-11-27T18:00:00+09:00' },
      // +2（金）: 隣接する2件が1つに
      { start: '2026-11-28T09:00:00+09:00', end: '2026-11-28T17:00:00+09:00' },
      // +3（土）: 8時前を含む
      { start: '2026-11-29T06:00:00+09:00', end: '2026-11-29T09:00:00+09:00' },
      { start: '2026-11-29T20:00:00+09:00', end: '2026-11-29T22:00:00+09:00' },
    ])
  })

  it('fixture の過去（day=-1）と14日目以降（day=14）は返らない', async () => {
    const stored = buildMock(NOW)
    expect(stored.busy.some(([s]) => s < jst('2026-11-26'))).toBe(true)
    expect(stored.busy.some(([s]) => s >= jst('2026-12-10'))).toBe(true)
    for (const q of ['?week=0', '?week=1']) {
      const body = await readBody(
        await handleBusy(request(q), fakeEnv(undefined, { MOCK: '1' }), NOW),
      )
      for (const { start, end } of body.busy) {
        expect(Date.parse(start)).toBeGreaterThanOrEqual(jst('2026-11-26'))
        expect(Date.parse(end)).toBeLessThanOrEqual(jst('2026-12-10'))
      }
    }
  })
})
