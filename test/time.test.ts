import { describe, expect, it } from 'vitest'
import {
  ceil30,
  floor30,
  jstParts,
  mondayOfWeekJST,
  startOfDayJST,
  toJstIso,
} from '../src/lib/time'
import { jst } from './helpers'

describe('floor30 / ceil30', () => {
  it('30分に切り捨て・切り上げる', () => {
    expect(floor30(jst('2026-11-26 09:10'))).toBe(jst('2026-11-26 09:00'))
    expect(ceil30(jst('2026-11-26 10:05'))).toBe(jst('2026-11-26 10:30'))
  })

  it('ちょうど境界はそのまま', () => {
    expect(floor30(jst('2026-11-26 09:30'))).toBe(jst('2026-11-26 09:30'))
    expect(ceil30(jst('2026-11-26 09:30'))).toBe(jst('2026-11-26 09:30'))
  })

  it('1ミリ秒でもはみ出したら次のマス', () => {
    expect(ceil30(jst('2026-11-26 09:30') + 1)).toBe(jst('2026-11-26 10:00'))
    expect(floor30(jst('2026-11-26 09:30') - 1)).toBe(jst('2026-11-26 09:00'))
  })
})

describe('startOfDayJST', () => {
  it('JST の 0:00 を返す（UTC の日付ではない）', () => {
    expect(startOfDayJST(jst('2026-11-26 14:20'))).toBe(jst('2026-11-26'))
    // JST 08:59 は UTC だと前日 23:59
    expect(startOfDayJST(jst('2026-11-26 08:59'))).toBe(jst('2026-11-26'))
    // JST 09:00 は UTC 0:00
    expect(startOfDayJST(jst('2026-11-26 09:00'))).toBe(jst('2026-11-26'))
  })

  it('0:00 ちょうどと 23:59', () => {
    expect(startOfDayJST(jst('2026-11-26 00:00'))).toBe(jst('2026-11-26'))
    expect(startOfDayJST(jst('2026-11-26 23:59'))).toBe(jst('2026-11-26'))
    expect(startOfDayJST(jst('2026-11-27 00:00'))).toBe(jst('2026-11-27'))
  })
})

describe('mondayOfWeekJST', () => {
  it('今日を含む週の月曜 0:00（JST）', () => {
    expect(mondayOfWeekJST(jst('2026-11-26 14:20'))).toBe(jst('2026-11-23'))
  })

  it('月曜 0:00 はその日、日曜 23:59 は6日前の月曜', () => {
    expect(mondayOfWeekJST(jst('2026-11-23 00:00'))).toBe(jst('2026-11-23'))
    expect(mondayOfWeekJST(jst('2026-11-29 23:59'))).toBe(jst('2026-11-23'))
    expect(mondayOfWeekJST(jst('2026-11-30 00:00'))).toBe(jst('2026-11-30'))
  })

  it('UTC では日曜でも JST で月曜なら月曜扱い', () => {
    // JST 月曜 08:00 = UTC 日曜 23:00
    expect(mondayOfWeekJST(jst('2026-11-30 08:00'))).toBe(jst('2026-11-30'))
  })
})

describe('toJstIso', () => {
  it('+09:00 付き・ミリ秒なしの ISO 8601', () => {
    expect(toJstIso(jst('2026-11-26 09:00'))).toBe('2026-11-26T09:00:00+09:00')
    expect(toJstIso(jst('2026-11-26 23:30'))).toBe('2026-11-26T23:30:00+09:00')
    expect(toJstIso(jst('2026-11-26 00:00') + 123)).toBe(
      '2026-11-26T00:00:00+09:00',
    )
  })
})

describe('jstParts', () => {
  it('JST の月・日・曜日（0=月）・時・分', () => {
    expect(jstParts(jst('2026-11-26 14:20'))).toEqual({
      month: 11,
      day: 26,
      weekday: 3, // 2026-11-26 は木曜（Figma のたたき台の「26（水）」は 2025 年の曜日）
      hour: 14,
      minute: 20,
    })
    expect(jstParts(jst('2026-11-30 08:00')).weekday).toBe(0)
    expect(jstParts(jst('2026-11-29 23:59')).weekday).toBe(6)
  })
})
