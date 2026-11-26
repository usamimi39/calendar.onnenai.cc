import { describe, expect, it } from 'vitest'
import { buildWeek, nowSlot } from '../src/lib/week'
import type { BusyResponse } from '../src/lib/types'
import { jst } from './helpers'

const NOW = jst('2026-11-26 14:20') // 木曜

const data: BusyResponse = {
  timezone: 'Asia/Tokyo',
  generatedAt: '2026-11-26T14:15:00+09:00',
  range: {
    start: '2026-11-26T00:00:00+09:00',
    end: '2026-11-30T00:00:00+09:00',
  },
  allDay: [
    { start: '2026-11-27T00:00:00+09:00', end: '2026-11-29T00:00:00+09:00' },
  ],
  busy: [
    { start: '2026-11-26T09:00:00+09:00', end: '2026-11-26T10:30:00+09:00' },
    { start: '2026-11-27T23:00:00+09:00', end: '2026-11-28T01:00:00+09:00' },
    { start: '2026-11-29T06:00:00+09:00', end: '2026-11-29T09:00:00+09:00' },
  ],
}

describe('buildWeek', () => {
  const view = buildWeek(data, NOW, 0)

  it('月〜日の7日、今日より前は past、今日は today', () => {
    expect(view.first).toBe(jst('2026-11-23'))
    expect(view.last).toBe(jst('2026-11-29'))
    expect(view.days.map((d) => d.state)).toEqual([
      'past',
      'past',
      'past',
      'today',
      'default',
      'default',
      'default',
    ])
    expect(view.generatedAt).toBe(jst('2026-11-26 14:15'))
  })

  it('日をまたぐ区間は両方の日に切って入る', () => {
    expect(view.days[4].busy).toEqual([
      [jst('2026-11-27 23:00'), jst('2026-11-28 00:00')],
    ])
    expect(view.days[5].busy).toEqual([
      [jst('2026-11-28 00:00'), jst('2026-11-28 01:00')],
    ])
  })

  it('8時前があれば early、グリッドは 8:00 で切る', () => {
    const sun = view.days[6]
    expect(sun.early).toBe(true)
    expect(sun.busy).toEqual([
      [jst('2026-11-29 06:00'), jst('2026-11-29 09:00')],
    ])
    expect(sun.segments[0]).toMatchObject({ kind: 'busy', slots: 2 })
    expect(view.days[5].early).toBe(true) // 0:00–1:00
    expect(view.days[3].early).toBe(false)
  })

  it('終日予定のある日は allDay（2日間の終日は両方の日）', () => {
    expect(view.days.map((d) => d.allDay)).toEqual([
      false,
      false,
      false,
      false,
      true,
      true,
      false,
    ])
    expect(view.hasAllDay).toBe(true)
  })

  it('過去の日は区間を持たない', () => {
    for (const day of view.days.slice(0, 3)) {
      expect(day.busy).toEqual([])
      expect(day.segments).toEqual([{ kind: 'free', slots: 32 }])
    }
  })

  it('week=1 は来週の月曜から', () => {
    const next = buildWeek(
      {
        ...data,
        range: {
          start: '2026-11-30T00:00:00+09:00',
          end: '2026-12-07T00:00:00+09:00',
        },
      },
      NOW,
      1,
    )
    expect(next.first).toBe(jst('2026-11-30'))
    expect(next.days.every((d) => d.state === 'default')).toBe(true)
  })
})

describe('nowSlot', () => {
  const day = jst('2026-11-26')

  it('30分単位で切り捨てたマス（14:20 → 14:00 = 12マス目）', () => {
    expect(nowSlot(day, NOW)).toBe(12)
    expect(nowSlot(day, jst('2026-11-26 08:00'))).toBe(0)
    expect(nowSlot(day, jst('2026-11-26 23:59'))).toBe(31)
  })

  it('8:00 前と別の日は null', () => {
    expect(nowSlot(day, jst('2026-11-26 07:59'))).toBeNull()
    expect(nowSlot(day, jst('2026-11-27 00:00'))).toBeNull()
  })
})
