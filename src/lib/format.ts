// 画面に出す日付・時刻の書式（Figma の表記に合わせる）。全部 JST
import { calendarText } from '../content/site'
import { MINUTE, jstParts } from './time'

const pad = (n: number) => String(n).padStart(2, '0')

// "11/26"
export function formatMonthDay(t: number): string {
  const { month, day } = jstParts(t)
  return `${month}/${day}`
}

// "11/26（木）"
export function formatDateWithWeekday(t: number): string {
  return `${formatMonthDay(t)}（${calendarText.weekdays[jstParts(t).weekday]}）`
}

// "09:00"。base（その日の 0:00）を渡すと、翌日 0:00 を "24:00" と書く
export function formatTime(t: number, base?: number): string {
  if (base !== undefined) {
    const minutes = Math.round((t - base) / MINUTE)
    return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
  }
  const { hour, minute } = jstParts(t)
  return `${pad(hour)}:${pad(minute)}`
}

// "09:00–10:30"
export function formatTimeRange(
  start: number,
  end: number,
  base?: number,
): string {
  return `${formatTime(start, base)}–${formatTime(end, base)}`
}

// 週グリッドの時刻ラベル "8:00"（0埋めしない）
export function formatHourLabel(hour: number): string {
  return `${hour}:00`
}

// ツールバーの期間。PC "11/24（月）– 11/30（日）"（全角括弧の後ろは空けない）、スマホ "11/24 – 11/30"
export function formatPeriod(
  first: number,
  last: number,
  withWeekday: boolean,
): string {
  return withWeekday
    ? `${formatDateWithWeekday(first)}– ${formatDateWithWeekday(last)}`
    : `${formatMonthDay(first)} – ${formatMonthDay(last)}`
}

// "最終更新 11/26 14:15"
export function formatUpdated(t: number): string {
  return `${calendarText.updatedPrefix} ${formatMonthDay(t)} ${formatTime(t)}`
}

// <time dateTime> 用の "2026-11-26"
export function toDateAttr(t: number): string {
  return new Date(t + 9 * 60 * MINUTE).toISOString().slice(0, 10)
}
