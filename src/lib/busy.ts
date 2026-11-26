// 埋まっている区間の計算（DESIGN.md §4〜§6.3）。全部純粋関数で、Worker と画面で共用する
// 区間は [開始, 終了) の epoch ミリ秒。カレンダーの区別はここに来る前に捨てている
import {
  DAY,
  HALF_HOUR,
  HOUR,
  ceil30,
  floor30,
  mondayOfWeekJST,
  startOfDayJST,
} from './time'

export type Interval = [start: number, end: number]
export type Week = 0 | 1

export const PUBLIC_DAYS = 14 // 公開上限（D1）
export const GRID_START_HOUR = 8 // 週グリッドは 8:00〜24:00
export const SLOTS_PER_DAY = ((24 - GRID_START_HOUR) * HOUR) / HALF_HOUR // 32

// 開始は30分に切り捨て、終了は30分に切り上げ
export function roundInterval([start, end]: Interval): Interval {
  return [floor30(start), ceil30(end)]
}

// 開始順に並べ、重なり・隣接（next.start <= cur.end）を1つにする。長さ0以下は捨てる
export function mergeIntervals(list: readonly Interval[]): Interval[] {
  const sorted = list.filter(([s, e]) => s < e).sort((a, b) => a[0] - b[0])
  const merged: Interval[] = []
  for (const [s, e] of sorted) {
    const last = merged.at(-1)
    if (last && s <= last[1]) {
      last[1] = Math.max(last[1], e)
    } else {
      merged.push([s, e])
    }
  }
  return merged
}

// 丸め → マージ（cron で KV に保存する形）
export function normalize(list: readonly Interval[]): Interval[] {
  return mergeIntervals(list.map(roundInterval))
}

// 窓の中に切り詰める。完全に外（端に接するだけも含む）は捨てる
export function clipToWindow(
  list: readonly Interval[],
  [ws, we]: Interval,
): Interval[] {
  const clipped: Interval[] = []
  for (const [s, e] of list) {
    const cs = Math.max(s, ws)
    const ce = Math.min(e, we)
    if (cs < ce) clipped.push([cs, ce])
  }
  return clipped
}

// 2つの窓の重なり。重ならなければ長さ0の窓
export function intersect([as, ae]: Interval, [bs, be]: Interval): Interval {
  const s = Math.max(as, bs)
  return [s, Math.max(s, Math.min(ae, be))]
}

// 公開上限 L = [今日 0:00 JST, +14日)
export function publicLimit(now: number): Interval {
  const today = startOfDayJST(now)
  return [today, today + PUBLIC_DAYS * DAY]
}

// 週窓 W = 今日を含む週の月曜 0:00 + week×7日 から7日間
export function weekWindow(now: number, week: Week): Interval {
  const start = mondayOfWeekJST(now) + week * 7 * DAY
  return [start, start + 7 * DAY]
}

// 配信する窓 = W ∩ L
export function servedWindow(now: number, week: Week): Interval {
  return intersect(weekWindow(now, week), publicLimit(now))
}

export type Segment =
  | { kind: 'free'; slots: number }
  | { kind: 'busy'; slots: number; start: number; end: number }

// 1日の列（8:00〜24:00 の32マス）を「空き n マス / 埋まり n マス」の並びにする（DESIGN.md §6.3）
// list は normalize 済み（30分単位・重なりなし・開始順）であること
export function toSegments(
  dayStart: number,
  list: readonly Interval[],
): Segment[] {
  const gridStart = dayStart + GRID_START_HOUR * HOUR
  const gridEnd = dayStart + DAY
  const slots = (from: number, to: number) => (to - from) / HALF_HOUR

  const segments: Segment[] = []
  let cursor = gridStart
  for (const [s, e] of clipToWindow(list, [gridStart, gridEnd])) {
    if (s > cursor) segments.push({ kind: 'free', slots: slots(cursor, s) })
    segments.push({ kind: 'busy', slots: slots(s, e), start: s, end: e })
    cursor = e
  }
  if (cursor < gridEnd)
    segments.push({ kind: 'free', slots: slots(cursor, gridEnd) })
  return segments
}

// その日の 8:00 より前に埋まりがあるか（DayHeader の Early）
export function hasBusyBefore(
  dayStart: number,
  list: readonly Interval[],
): boolean {
  const gridStart = dayStart + GRID_START_HOUR * HOUR
  return clipToWindow(list, [dayStart, gridStart]).length > 0
}
