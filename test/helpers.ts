// テスト用: JST の壁時計の時刻を epoch ms にする（例: jst('2026-11-26 14:20')）
export function jst(wallClock: string): number {
  const [date, time = '00:00'] = wallClock.split(' ')
  const t = Date.parse(`${date}T${time}:00+09:00`)
  if (Number.isNaN(t)) throw new Error(`bad time: ${wallClock}`)
  return t
}

export const MIN = 60_000
export const HOUR = 60 * MIN
export const DAY = 24 * HOUR
