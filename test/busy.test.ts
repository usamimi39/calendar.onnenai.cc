import { describe, expect, it } from 'vitest'
import {
  SLOTS_PER_DAY,
  clipToWindow,
  hasBusyBefore,
  intersect,
  mergeIntervals,
  normalize,
  publicLimit,
  roundInterval,
  servedWindow,
  toSegments,
  weekWindow,
} from '../src/lib/busy'
import type { Interval } from '../src/lib/busy'
import { DAY, jst } from './helpers'

const iv = (s: string, e: string): Interval => [jst(s), jst(e)]

describe('roundInterval', () => {
  it('開始は切り捨て、終了は切り上げ（09:10–10:05 → 09:00–10:30）', () => {
    expect(roundInterval(iv('2026-11-26 09:10', '2026-11-26 10:05'))).toEqual(
      iv('2026-11-26 09:00', '2026-11-26 10:30'),
    )
  })

  it('ちょうど境界はそのまま', () => {
    expect(roundInterval(iv('2026-11-26 09:00', '2026-11-26 10:30'))).toEqual(
      iv('2026-11-26 09:00', '2026-11-26 10:30'),
    )
  })

  it('同じマスの中の短い予定も1マスになる', () => {
    expect(roundInterval(iv('2026-11-26 09:05', '2026-11-26 09:10'))).toEqual(
      iv('2026-11-26 09:00', '2026-11-26 09:30'),
    )
  })
})

describe('mergeIntervals', () => {
  it('重なりを結合する', () => {
    expect(
      mergeIntervals([
        iv('2026-11-26 09:00', '2026-11-26 10:30'),
        iv('2026-11-26 10:00', '2026-11-26 11:00'),
      ]),
    ).toEqual([iv('2026-11-26 09:00', '2026-11-26 11:00')])
  })

  it('隣接（10:00 終了 / 10:00 開始）を結合する', () => {
    expect(
      mergeIntervals([
        iv('2026-11-26 10:00', '2026-11-26 11:00'),
        iv('2026-11-26 09:00', '2026-11-26 10:00'),
      ]),
    ).toEqual([iv('2026-11-26 09:00', '2026-11-26 11:00')])
  })

  it('包含は外側だけ残る', () => {
    expect(
      mergeIntervals([
        iv('2026-11-26 09:00', '2026-11-26 17:00'),
        iv('2026-11-26 10:00', '2026-11-26 11:00'),
      ]),
    ).toEqual([iv('2026-11-26 09:00', '2026-11-26 17:00')])
  })

  it('別カレンダーの同時刻は1つになる', () => {
    expect(
      mergeIntervals([
        iv('2026-11-26 13:00', '2026-11-26 14:30'),
        iv('2026-11-26 13:00', '2026-11-26 14:30'),
      ]),
    ).toEqual([iv('2026-11-26 13:00', '2026-11-26 14:30')])
  })

  it('離れた区間は分けたまま、開始順に並べる', () => {
    expect(
      mergeIntervals([
        iv('2026-11-26 19:00', '2026-11-26 21:00'),
        iv('2026-11-26 09:00', '2026-11-26 10:30'),
      ]),
    ).toEqual([
      iv('2026-11-26 09:00', '2026-11-26 10:30'),
      iv('2026-11-26 19:00', '2026-11-26 21:00'),
    ])
  })

  it('長さ0以下の区間は捨てる。入力は書き換えない', () => {
    const input = [
      iv('2026-11-26 10:00', '2026-11-26 10:00'),
      iv('2026-11-26 12:00', '2026-11-26 11:00'),
    ]
    const copy = structuredClone(input)
    expect(mergeIntervals(input)).toEqual([])
    expect(input).toEqual(copy)
  })
})

describe('normalize（丸め → マージ）', () => {
  it('丸めた結果つながるものは結合する', () => {
    expect(
      normalize([
        iv('2026-11-26 09:10', '2026-11-26 09:50'),
        iv('2026-11-26 10:05', '2026-11-26 10:20'),
      ]),
    ).toEqual([iv('2026-11-26 09:00', '2026-11-26 10:30')])
  })
})

describe('clipToWindow', () => {
  const win = iv('2026-11-26', '2026-12-10')

  it('前日からまたぐ区間は窓の開始で切る', () => {
    expect(
      clipToWindow([iv('2026-11-25 22:00', '2026-11-26 02:00')], win),
    ).toEqual([iv('2026-11-26 00:00', '2026-11-26 02:00')])
  })

  it('上限をまたぐ区間は上限で切る', () => {
    expect(
      clipToWindow([iv('2026-12-09 22:00', '2026-12-10 02:00')], win),
    ).toEqual([iv('2026-12-09 22:00', '2026-12-10 00:00')])
  })

  it('完全に外の区間は捨てる（ちょうど端に接するものも）', () => {
    expect(
      clipToWindow(
        [
          iv('2026-11-25 09:00', '2026-11-25 10:00'),
          iv('2026-11-25 23:00', '2026-11-26 00:00'),
          iv('2026-12-10 00:00', '2026-12-10 01:00'),
          iv('2026-12-11 09:00', '2026-12-11 10:00'),
        ],
        win,
      ),
    ).toEqual([])
  })

  it('空の窓なら何も返さない', () => {
    const empty: Interval = [jst('2026-11-26'), jst('2026-11-26')]
    expect(
      clipToWindow([iv('2026-11-25 09:00', '2026-11-27 10:00')], empty),
    ).toEqual([])
  })
})

describe('publicLimit', () => {
  it('[今日 0:00, +14日 0:00) のちょうど14日間', () => {
    expect(publicLimit(jst('2026-11-26 14:20'))).toEqual(
      iv('2026-11-26', '2026-12-10'),
    )
  })

  it('23:59 と 0:00 で日付が切り替わる', () => {
    expect(publicLimit(jst('2026-11-26 23:59'))[0]).toBe(jst('2026-11-26'))
    expect(publicLimit(jst('2026-11-27 00:00'))[0]).toBe(jst('2026-11-27'))
  })
})

describe('weekWindow', () => {
  it('week=0 は今日を含む月〜日、week=1 は来週', () => {
    const now = jst('2026-11-26 14:20')
    expect(weekWindow(now, 0)).toEqual(iv('2026-11-23', '2026-11-30'))
    expect(weekWindow(now, 1)).toEqual(iv('2026-11-30', '2026-12-07'))
  })

  it('月曜 0:00 / 日曜 23:59 の境界', () => {
    expect(weekWindow(jst('2026-11-30 00:00'), 0)).toEqual(
      iv('2026-11-30', '2026-12-07'),
    )
    expect(weekWindow(jst('2026-11-29 23:59'), 0)).toEqual(
      iv('2026-11-23', '2026-11-30'),
    )
  })
})

describe('intersect', () => {
  it('重なる部分を返す', () => {
    expect(
      intersect(iv('2026-11-23', '2026-11-30'), iv('2026-11-26', '2026-12-10')),
    ).toEqual(iv('2026-11-26', '2026-11-30'))
  })

  it('重ならなければ長さ0の窓（W ∩ L が空）', () => {
    const r = intersect(
      iv('2026-12-14', '2026-12-21'),
      iv('2026-11-26', '2026-12-10'),
    )
    expect(r[1] - r[0]).toBe(0)
  })
})

describe('servedWindow（W ∩ L）', () => {
  it('木曜の week=0 は今日〜日曜（月〜水は過去なので入らない）', () => {
    expect(servedWindow(jst('2026-11-26 14:20'), 0)).toEqual(
      iv('2026-11-26', '2026-11-30'),
    )
  })

  it('木曜の week=1 は来週まるごと', () => {
    expect(servedWindow(jst('2026-11-26 14:20'), 1)).toEqual(
      iv('2026-11-30', '2026-12-07'),
    )
  })

  it('月曜 0:00 の week=0 は月〜日まるごと', () => {
    expect(servedWindow(jst('2026-11-30 00:00'), 0)).toEqual(
      iv('2026-11-30', '2026-12-07'),
    )
  })

  it('日曜 23:59 の week=0 は日曜だけ、week=1 は来週まるごと', () => {
    const now = jst('2026-11-29 23:59')
    expect(servedWindow(now, 0)).toEqual(iv('2026-11-29', '2026-11-30'))
    expect(servedWindow(now, 1)).toEqual(iv('2026-11-30', '2026-12-07'))
  })

  it('どの時刻でも公開上限の中に収まる', () => {
    const start = jst('2026-11-23')
    for (let t = start; t < start + 14 * DAY; t += 37 * 60_000) {
      const [ls, le] = publicLimit(t)
      for (const week of [0, 1] as const) {
        const [s, e] = servedWindow(t, week)
        expect(s).toBeGreaterThanOrEqual(ls)
        expect(e).toBeLessThanOrEqual(le)
        expect(e).toBeGreaterThanOrEqual(s)
      }
    }
  })
})

describe('toSegments（8:00〜24:00 の32マス）', () => {
  const day = jst('2026-11-26')
  const total = (segs: { slots: number }[]) =>
    segs.reduce((n, s) => n + s.slots, 0)

  it('予定がなければ空き32マス', () => {
    expect(toSegments(day, [])).toEqual([{ kind: 'free', slots: 32 }])
    expect(SLOTS_PER_DAY).toBe(32)
  })

  it('Figma の水曜（09:00–10:30 / 13:00–14:30 / 19:00–21:00）', () => {
    const segs = toSegments(day, [
      iv('2026-11-26 09:00', '2026-11-26 10:30'),
      iv('2026-11-26 13:00', '2026-11-26 14:30'),
      iv('2026-11-26 19:00', '2026-11-26 21:00'),
    ])
    expect(segs).toEqual([
      { kind: 'free', slots: 2 },
      {
        kind: 'busy',
        slots: 3,
        start: jst('2026-11-26 09:00'),
        end: jst('2026-11-26 10:30'),
      },
      { kind: 'free', slots: 5 },
      {
        kind: 'busy',
        slots: 3,
        start: jst('2026-11-26 13:00'),
        end: jst('2026-11-26 14:30'),
      },
      { kind: 'free', slots: 9 },
      {
        kind: 'busy',
        slots: 4,
        start: jst('2026-11-26 19:00'),
        end: jst('2026-11-26 21:00'),
      },
      { kind: 'free', slots: 6 },
    ])
    expect(total(segs)).toBe(32)
  })

  it('8:00 より前は 8:00 で切る（06:00–09:00 → 8:00 から2マス）', () => {
    const segs = toSegments(day, [iv('2026-11-26 06:00', '2026-11-26 09:00')])
    expect(segs[0]).toEqual({
      kind: 'busy',
      slots: 2,
      start: jst('2026-11-26 08:00'),
      end: jst('2026-11-26 09:00'),
    })
    expect(total(segs)).toBe(32)
  })

  it('終日（0:00〜翌0:00）は32マス全部埋まる', () => {
    const segs = toSegments(day, [iv('2026-11-26 00:00', '2026-11-27 00:00')])
    expect(segs).toEqual([
      {
        kind: 'busy',
        slots: 32,
        start: jst('2026-11-26 08:00'),
        end: jst('2026-11-27 00:00'),
      },
    ])
  })

  it('別の日の区間は無視、日をまたぐ区間はその日の分だけ', () => {
    const segs = toSegments(day, [
      iv('2026-11-25 20:00', '2026-11-25 22:00'),
      iv('2026-11-26 23:00', '2026-11-27 01:00'),
    ])
    expect(segs).toEqual([
      { kind: 'free', slots: 30 },
      {
        kind: 'busy',
        slots: 2,
        start: jst('2026-11-26 23:00'),
        end: jst('2026-11-27 00:00'),
      },
    ])
  })

  it('8:00 前だけの区間はグリッドに出ない', () => {
    expect(
      toSegments(day, [iv('2026-11-26 06:00', '2026-11-26 08:00')]),
    ).toEqual([{ kind: 'free', slots: 32 }])
  })
})

describe('hasBusyBefore（DayHeader の「▲ 8時前あり」）', () => {
  const day = jst('2026-11-26')

  it('8:00 より前に少しでもかかっていれば true', () => {
    expect(
      hasBusyBefore(day, [iv('2026-11-26 06:00', '2026-11-26 09:00')]),
    ).toBe(true)
    expect(
      hasBusyBefore(day, [iv('2026-11-25 23:00', '2026-11-26 01:00')]),
    ).toBe(true)
  })

  it('8:00 ちょうど開始・別の日・予定なしは false', () => {
    expect(
      hasBusyBefore(day, [iv('2026-11-26 08:00', '2026-11-26 09:00')]),
    ).toBe(false)
    expect(
      hasBusyBefore(day, [iv('2026-11-25 06:00', '2026-11-25 07:00')]),
    ).toBe(false)
    expect(hasBusyBefore(day, [])).toBe(false)
  })
})
