import { describe, expect, it } from 'vitest'
import {
  formatDateWithWeekday,
  formatHourLabel,
  formatPeriod,
  formatTime,
  formatTimeRange,
  formatUpdated,
  toDateAttr,
} from '../src/lib/format'
import { jst } from './helpers'

describe('format（Figma の表記）', () => {
  it('日付と曜日 "11/26（木）"', () => {
    expect(formatDateWithWeekday(jst('2026-11-26 14:20'))).toBe('11/26（木）')
    expect(formatDateWithWeekday(jst('2026-11-30'))).toBe('11/30（月）')
  })

  it('時刻は0埋め、翌日0:00は base を渡すと 24:00', () => {
    expect(formatTime(jst('2026-11-26 09:00'))).toBe('09:00')
    expect(formatTime(jst('2026-11-27 00:00'), jst('2026-11-26'))).toBe('24:00')
    expect(
      formatTimeRange(
        jst('2026-11-26 23:00'),
        jst('2026-11-27 00:00'),
        jst('2026-11-26'),
      ),
    ).toBe('23:00–24:00')
  })

  it('グリッドの時刻ラベルは0埋めしない', () => {
    expect(formatHourLabel(8)).toBe('8:00')
    expect(formatHourLabel(23)).toBe('23:00')
  })

  it('期間: PC は曜日つき、スマホは日付だけ', () => {
    expect(formatPeriod(jst('2026-11-23'), jst('2026-11-29'), true)).toBe(
      '11/23（月）– 11/29（日）',
    )
    expect(formatPeriod(jst('2026-11-23'), jst('2026-11-29'), false)).toBe(
      '11/23 – 11/29',
    )
  })

  it('最終更新', () => {
    expect(formatUpdated(jst('2026-11-26 14:15'))).toBe('最終更新 11/26 14:15')
  })

  it('<time> 用の日付', () => {
    expect(toDateAttr(jst('2026-11-26 23:59'))).toBe('2026-11-26')
    expect(toDateAttr(jst('2026-11-27 00:00'))).toBe('2026-11-27')
  })
})
