import { describe, expect, it } from 'vitest'
import {
  GoogleError,
  getAccessToken,
  queryFreeBusy,
} from '../../src/worker/google'
import { jst } from '../helpers'
import { FREEBUSY_URL, TOKEN_URL, fakeGoogle } from './fake-google'

const creds = {
  clientId: 'cid',
  clientSecret: 'csecret',
  refreshToken: 'rtoken',
}

describe('getAccessToken', () => {
  it('refresh_token で token エンドポイントを1回だけ叩く', async () => {
    const { calls, fetchImpl } = fakeGoogle()
    expect(await getAccessToken(creds, fetchImpl)).toBe('test-access-token')
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe(TOKEN_URL)
    expect(calls[0].init.method).toBe('POST')
    const body = new URLSearchParams(String(calls[0].init.body))
    expect(Object.fromEntries(body)).toEqual({
      grant_type: 'refresh_token',
      client_id: 'cid',
      client_secret: 'csecret',
      refresh_token: 'rtoken',
    })
  })

  it('失敗したら stage=token とステータスだけを持つエラー', async () => {
    const { fetchImpl } = fakeGoogle({ tokenStatus: 400 })
    const err = await getAccessToken(creds, fetchImpl).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(GoogleError)
    expect(err).toMatchObject({ stage: 'token', status: 400 })
  })
})

describe('queryFreeBusy', () => {
  const window: [number, number] = [jst('2026-11-26'), jst('2026-12-11')]

  it('全カレンダーを1リクエストで聞き、区間を1つの配列にまとめる（カレンダーの区別を捨てる）', async () => {
    const { calls, fetchImpl } = fakeGoogle({
      calendars: {
        'cal-a': {
          busy: [
            {
              start: '2026-11-26T09:00:00+09:00',
              end: '2026-11-26T10:00:00+09:00',
            },
          ],
        },
        'cal-b': {
          busy: [
            { start: '2026-11-26T01:00:00Z', end: '2026-11-26T02:00:00Z' },
          ],
        },
      },
    })
    const result = await queryFreeBusy(
      'tok',
      window,
      ['cal-a', 'cal-b'],
      fetchImpl,
    )

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe(FREEBUSY_URL)
    expect(new Headers(calls[0].init.headers).get('Authorization')).toBe(
      'Bearer tok',
    )
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      timeMin: '2026-11-26T00:00:00+09:00',
      timeMax: '2026-12-11T00:00:00+09:00',
      timeZone: 'Asia/Tokyo',
      items: [{ id: 'cal-a' }, { id: 'cal-b' }],
    })
    expect(result).toEqual({
      intervals: [
        [jst('2026-11-26 09:00'), jst('2026-11-26 10:00')],
        [jst('2026-11-26 10:00'), jst('2026-11-26 11:00')],
      ],
      okCount: 2,
      failedCount: 0,
    })
  })

  it('errors があるカレンダー・返ってこないカレンダーは捨てて続ける（共有カレンダーなど）', async () => {
    const { fetchImpl } = fakeGoogle({
      calendars: {
        'cal-a': {
          busy: [
            {
              start: '2026-11-26T09:00:00+09:00',
              end: '2026-11-26T10:00:00+09:00',
            },
          ],
        },
        'cal-b': {
          errors: [{ domain: 'global', reason: 'notFound' }],
          busy: [],
        },
      },
    })
    const result = await queryFreeBusy(
      'tok',
      window,
      ['cal-a', 'cal-b', 'cal-c'],
      fetchImpl,
    )
    expect(result.okCount).toBe(1)
    expect(result.failedCount).toBe(2)
    expect(result.intervals).toHaveLength(1)
  })

  it('start / end 以外のフィールドは読まない。壊れた区間は捨てる', async () => {
    const { fetchImpl } = fakeGoogle({
      calendars: {
        'cal-a': {
          busy: [
            {
              start: '2026-11-26T09:00:00+09:00',
              end: '2026-11-26T10:00:00+09:00',
              summary: 'x',
            },
            { start: 'not-a-date', end: '2026-11-26T10:00:00+09:00' },
            { start: '2026-11-26T09:00:00+09:00' },
          ],
        },
      },
    })
    const result = await queryFreeBusy('tok', window, ['cal-a'], fetchImpl)
    expect(result.intervals).toEqual([
      [jst('2026-11-26 09:00'), jst('2026-11-26 10:00')],
    ])
  })

  it('HTTP エラーは stage=freebusy', async () => {
    const { fetchImpl } = fakeGoogle({ freeBusyStatus: 503 })
    await expect(
      queryFreeBusy('tok', window, ['cal-a'], fetchImpl),
    ).rejects.toMatchObject({
      stage: 'freebusy',
      status: 503,
    })
  })
})
