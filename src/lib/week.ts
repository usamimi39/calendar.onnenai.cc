// /api/busy のレスポンスと現在時刻から、1週間（月〜日）の表示用データを作る（DESIGN.md §6.3〜§6.5）
import {
  GRID_START_HOUR,
  SLOTS_PER_DAY,
  clipToWindow,
  hasBusyBefore,
  toSegments,
  weekWindow,
} from './busy'
import type { Interval, Segment, Week } from './busy'
import { DAY, HALF_HOUR, HOUR, floor30, startOfDayJST } from './time'
import type { BusyResponse } from './types'

export type DayState = 'past' | 'today' | 'default'

export type DayView = {
  start: number // その日の JST 0:00
  state: DayState
  busy: Interval[] // その日の 0:00〜24:00 に切った区間（リスト用。8時前もそのまま）
  segments: Segment[] // 8:00〜24:00 の32マス（グリッド用）
  early: boolean // 8:00 より前に埋まりがある
}

export type WeekView = {
  first: number // 月曜 0:00
  last: number // 日曜 0:00
  days: DayView[]
  generatedAt: number
}

export function parseBusy(data: BusyResponse): Interval[] {
  return data.busy.map(({ start, end }) => [Date.parse(start), Date.parse(end)])
}

// range（W ∩ L）より前・後の日は「過去」と同じ扱い（灰色・区間なし）
export function buildWeek(
  data: BusyResponse,
  now: number,
  week: Week,
): WeekView {
  const [first] = weekWindow(now, week)
  const rangeStart = Date.parse(data.range.start)
  const rangeEnd = Date.parse(data.range.end)
  const today = startOfDayJST(now)
  const busy = parseBusy(data)

  const days = Array.from({ length: 7 }, (_, i): DayView => {
    const start = first + i * DAY
    const inRange = start >= rangeStart && start < rangeEnd
    const dayBusy = inRange ? clipToWindow(busy, [start, start + DAY]) : []
    return {
      start,
      state: !inRange ? 'past' : start === today ? 'today' : 'default',
      busy: dayBusy,
      segments: toSegments(start, dayBusy),
      early: hasBusyBefore(start, dayBusy),
    }
  })

  return {
    first,
    last: first + 6 * DAY,
    days,
    generatedAt: Date.parse(data.generatedAt),
  }
}

// 現在時刻の線の位置（8:00 から何マス目か）。8:00 前・24:00 以降は null（DESIGN.md §6.4）
export function nowSlot(dayStart: number, now: number): number | null {
  const slot = (floor30(now) - (dayStart + GRID_START_HOUR * HOUR)) / HALF_HOUR
  return slot >= 0 && slot < SLOTS_PER_DAY ? slot : null
}
