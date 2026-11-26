// MOCK=1 のときのデータ（DESIGN.md §6.7）。fixtures/mock-busy.json の「今日からの相対日 + JST 時刻」を
// 今日の日付に置き換えて、cron と同じく normalize した形にする。日付を固定しないので、いつ開いても今日から表示される
import fixture from '../../fixtures/mock-busy.json'
import { splitBusy } from '../lib/busy'
import type { Interval } from '../lib/busy'
import { DAY, MINUTE, startOfDayJST } from '../lib/time'
import type { StoredBusy } from './store'

type MockEntry = { day: number; start: string; end: string }

const CRON_INTERVAL = 15 * MINUTE

// "HH:MM" → その日の 0:00 からのミリ秒。"24:00" や "25:00"（翌日 1:00）も書ける
function offsetOf(hhmm: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm)
  if (!match) throw new Error(`mock-busy.json: 時刻の形式が違う: ${hhmm}`)
  return (Number(match[1]) * 60 + Number(match[2])) * MINUTE
}

export function buildMock(
  now: number,
  entries: readonly MockEntry[] = fixture.busy,
): StoredBusy {
  const today = startOfDayJST(now)
  const intervals: Interval[] = entries.map(({ day, start, end }) => {
    const base = today + day * DAY
    return [base + offsetOf(start), base + offsetOf(end)]
  })
  return {
    // cron が直前の15分境界で取得した、という体裁
    generatedAt: Math.floor(now / CRON_INTERVAL) * CRON_INTERVAL,
    ...splitBusy(intervals),
  }
}
