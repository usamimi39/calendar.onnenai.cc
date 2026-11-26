import { describe, expect, it } from 'vitest'
import { handleBusy } from '../../src/worker/api'
import { jst } from '../helpers'
import { readBody } from './read-body'

const NOW = jst('2026-11-26 14:20')

// KV に余計なフィールド（カレンダー名・ID・カレンダーごとの区別）が紛れ込んでも、レスポンスには出ない
const polluted = {
  generatedAt: jst('2026-11-26 14:15'),
  busy: [[jst('2026-11-26 09:00'), jst('2026-11-26 10:30')]],
  calendars: { 'someone@example.com': { busy: [] } },
  summary: '秘密の予定',
  calendarId: 'example-calendar-id',
}

function env(): Env {
  return {
    BUSY_KV: { get: async () => polluted } as unknown as KVNamespace,
    ASSETS: {} as Fetcher,
    TIMEZONE: 'Asia/Tokyo',
    CALENDAR_IDS: 'someone@example.com,example-calendar-id',
  }
}

describe('レスポンスはホワイトリストだけ', () => {
  it.each(['?week=0', '?week=1'])(
    '%s: キー集合が許可リストと完全一致',
    async (q) => {
      const res = await handleBusy(
        new Request(`https://calendar.onnenai.cc/api/busy${q}`),
        env(),
        NOW,
      )
      const body = await readBody(res)
      expect(Object.keys(body).sort()).toEqual(
        ['allDay', 'busy', 'generatedAt', 'range', 'timezone'].sort(),
      )
      expect(Object.keys(body.range).sort()).toEqual(['end', 'start'])
      for (const item of [...body.busy, ...body.allDay]) {
        expect(Object.keys(item).sort()).toEqual(['end', 'start'])
      }
    },
  )

  it('KV や Env の余計な値が本文に出ない', async () => {
    const text = await (
      await handleBusy(
        new Request('https://calendar.onnenai.cc/api/busy?week=0'),
        env(),
        NOW,
      )
    ).text()
    for (const secret of [
      'someone@example.com',
      'example-calendar-id',
      '秘密の予定',
      'calendars',
      'summary',
    ]) {
      expect(text).not.toContain(secret)
    }
  })
})
