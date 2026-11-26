import { afterEach, describe, expect, it, vi } from 'vitest'
import { refresh } from '../../src/worker/refresh'
import { jst } from '../helpers'
import { fakeGoogle, fakeKV } from './fake-google'

const NOW = jst('2026-11-26 23:50')
const IDS = 'someone@example.com, group-cal-id ,work@example.org'

function env(kv: KVNamespace, extra: Partial<Env> = {}): Env {
  return {
    BUSY_KV: kv,
    ASSETS: {} as Fetcher,
    TIMEZONE: 'Asia/Tokyo',
    GOOGLE_CLIENT_ID: 'cid',
    GOOGLE_CLIENT_SECRET: 'csecret',
    GOOGLE_REFRESH_TOKEN: 'rtoken',
    CALENDAR_IDS: IDS,
    ...extra,
  }
}

const okCalendars = {
  'someone@example.com': {
    busy: [
      { start: '2026-11-27T09:10:00+09:00', end: '2026-11-27T10:05:00+09:00' },
      { start: '2026-11-27T10:00:00+09:00', end: '2026-11-27T11:00:00+09:00' },
    ],
  },
  'group-cal-id': {
    busy: [
      { start: '2026-11-27T09:00:00+09:00', end: '2026-11-27T09:30:00+09:00' },
    ],
  },
  'work@example.org': {
    errors: [{ domain: 'global', reason: 'notFound' }],
    busy: [],
  },
}

// ログに ID・時刻・区間が出ていないことを確かめるため、console を全部捕まえる
function captureConsole() {
  const lines: string[] = []
  for (const level of ['log', 'info', 'warn', 'error', 'debug'] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      lines.push(JSON.stringify(args))
    })
  }
  return lines
}

afterEach(() => vi.restoreAllMocks())

describe('refresh（cron の本体）', () => {
  it('取得窓は [今日 0:00, +15日)、CALENDAR_IDS の空白は取り除く', async () => {
    captureConsole()
    const { kv } = fakeKV()
    const google = fakeGoogle({ calendars: okCalendars })
    await refresh(env(kv), NOW, google.fetchImpl)
    const body = JSON.parse(String(google.calls[1].init.body))
    expect(body.timeMin).toBe('2026-11-26T00:00:00+09:00')
    expect(body.timeMax).toBe('2026-12-11T00:00:00+09:00')
    expect(body.items).toEqual([
      { id: 'someone@example.com' },
      { id: 'group-cal-id' },
      { id: 'work@example.org' },
    ])
  })

  it('成功したカレンダーだけで丸め・マージして KV に保存する（1つ失敗しても続ける）', async () => {
    captureConsole()
    const { kv, puts } = fakeKV()
    const result = await refresh(
      env(kv),
      NOW,
      fakeGoogle({ calendars: okCalendars }).fetchImpl,
    )
    expect(result).toEqual({ ok: true, okCount: 2, failedCount: 1 })
    expect(puts).toHaveLength(1)
    expect(puts[0].key).toBe('busy:v1')
    expect(JSON.parse(puts[0].value)).toEqual({
      generatedAt: NOW,
      busy: [[jst('2026-11-27 09:00'), jst('2026-11-27 11:00')]],
    })
  })

  it('保存する値にカレンダー ID が入らない', async () => {
    captureConsole()
    const { kv, puts } = fakeKV()
    await refresh(
      env(kv),
      NOW,
      fakeGoogle({ calendars: okCalendars }).fetchImpl,
    )
    for (const id of [
      'someone@example.com',
      'group-cal-id',
      'work@example.org',
    ]) {
      expect(puts[0].value).not.toContain(id)
    }
  })

  it.each([
    [
      '全カレンダー失敗',
      { calendars: { 'someone@example.com': { errors: [{}] } } },
      'freebusy',
      undefined,
    ],
    ['トークン失効', { tokenStatus: 400 }, 'token', 400],
    ['Google ダウン', { freeBusyStatus: 503 }, 'freebusy', 503],
  ] as const)(
    '%s → KV に書かない（前回の値が残る）',
    async (_label, opts, stage, status) => {
      captureConsole()
      const { kv, puts, store } = fakeKV('{"generatedAt":1,"busy":[]}')
      const result = await refresh(env(kv), NOW, fakeGoogle(opts).fetchImpl)
      expect(result).toMatchObject({ ok: false, stage })
      if (status !== undefined) expect(result).toMatchObject({ status })
      expect(puts).toHaveLength(0)
      expect(store.get('busy:v1')).toBe('{"generatedAt":1,"busy":[]}')
    },
  )

  it.each([
    ['CALENDAR_IDS なし', { CALENDAR_IDS: ' , ' }],
    ['refresh token なし', { GOOGLE_REFRESH_TOKEN: '' }],
  ])('%s → Google を呼ばずに終わる', async (_label, extra) => {
    captureConsole()
    const { kv, puts } = fakeKV()
    const google = fakeGoogle()
    const result = await refresh(env(kv, extra), NOW, google.fetchImpl)
    expect(result).toMatchObject({ ok: false, stage: 'config' })
    expect(google.calls).toHaveLength(0)
    expect(puts).toHaveLength(0)
  })

  it('fetch 自体が落ちても例外を外に出さない', async () => {
    captureConsole()
    const { kv } = fakeKV()
    const failing = (async () => {
      throw new TypeError('network down: https://www.googleapis.com/...')
    }) as typeof fetch
    await expect(refresh(env(kv), NOW, failing)).resolves.toMatchObject({
      ok: false,
      stage: 'token',
    })
  })

  it('ログには段階・ステータス・件数だけ（ID・時刻・トークン・エラー本文を出さない）', async () => {
    const lines = captureConsole()
    for (const opts of [
      { calendars: okCalendars },
      { tokenStatus: 400 },
      { freeBusyStatus: 503 },
      { calendars: { 'someone@example.com': { errors: [{}] } } },
    ]) {
      const { kv } = fakeKV()
      await refresh(env(kv), NOW, fakeGoogle(opts).fetchImpl)
    }
    const log = lines.join('\n')
    expect(lines.length).toBeGreaterThan(0)
    for (const secret of [
      'someone@example.com',
      'group-cal-id',
      'work@example.org',
      'rtoken',
      'csecret',
      'test-access-token',
      '2026-11-2',
      'T09:',
      'invalid_grant',
      'googleapis',
    ]) {
      expect(log).not.toContain(secret)
    }
  })
})
