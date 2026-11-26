// KV に保存する形（DESIGN.md §4-5）。cron（refresh.ts）が書き、/api/busy（api.ts）が読む
// 区間は epoch ms の配列で持ち、ISO 化は配信時に行う。カレンダーの区別は持たない
import type { Interval } from '../lib/busy'

export const BUSY_KEY = 'busy:v1'

export type StoredBusy = {
  generatedAt: number // epoch ms
  busy: Interval[] // 時間指定の区間（normalize 済み）
  allDay: Interval[] // 終日の区間（splitBusy。0:00 始まり・丸 n 日）
}

const isTime = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v)

// KV の中身を信用しすぎない。形が違えば null（= データなし）として扱う
function parseIntervals(value: unknown): Interval[] | null {
  if (!Array.isArray(value)) return null
  const intervals: Interval[] = []
  for (const item of value) {
    if (!Array.isArray(item) || item.length !== 2) return null
    const [s, e] = item as unknown[]
    if (!isTime(s) || !isTime(e)) return null
    intervals.push([s, e])
  }
  return intervals
}

// allDay の無い値（終日の判定を入れる前に保存したもの）は、終日なしとして読む
export function parseStored(value: unknown): StoredBusy | null {
  if (typeof value !== 'object' || value === null) return null
  const { generatedAt, busy, allDay } = value as Record<string, unknown>
  if (!isTime(generatedAt)) return null
  const busyIntervals = parseIntervals(busy)
  const allDayIntervals = allDay === undefined ? [] : parseIntervals(allDay)
  if (!busyIntervals || !allDayIntervals) return null
  return { generatedAt, busy: busyIntervals, allDay: allDayIntervals }
}

export async function readStored(kv: KVNamespace): Promise<StoredBusy | null> {
  return parseStored(await kv.get(BUSY_KEY, 'json'))
}
