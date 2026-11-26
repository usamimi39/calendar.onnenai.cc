// JST の時刻ユーティリティ（DESIGN.md §3）。Worker と画面で共用する
// JST は夏時間のない UTC+9 固定なので、内部は全部 epoch ミリ秒で計算し、Intl やライブラリは使わない

export const MINUTE = 60_000
export const HALF_HOUR = 30 * MINUTE
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR
const JST_OFFSET = 9 * HOUR

// 30分単位に丸める。オフセットが30分の倍数なので UTC で計算しても JST と一致する
export function floor30(t: number): number {
  return Math.floor(t / HALF_HOUR) * HALF_HOUR
}

export function ceil30(t: number): number {
  return Math.ceil(t / HALF_HOUR) * HALF_HOUR
}

// t を含む日の JST 0:00
export function startOfDayJST(t: number): number {
  return Math.floor((t + JST_OFFSET) / DAY) * DAY - JST_OFFSET
}

// t を含む週の月曜 JST 0:00
export function mondayOfWeekJST(t: number): number {
  return startOfDayJST(t) - jstParts(t).weekday * DAY
}

// "2026-11-26T09:00:00+09:00"（ミリ秒は落とす）
export function toJstIso(t: number): string {
  return new Date(t + JST_OFFSET).toISOString().slice(0, 19) + '+09:00'
}

export type JstParts = {
  month: number // 1〜12
  day: number
  weekday: number // 0 = 月曜 … 6 = 日曜
  hour: number
  minute: number
}

// 表示用に JST の暦の値を取り出す
export function jstParts(t: number): JstParts {
  const d = new Date(t + JST_OFFSET)
  return {
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    weekday: (d.getUTCDay() + 6) % 7,
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  }
}
