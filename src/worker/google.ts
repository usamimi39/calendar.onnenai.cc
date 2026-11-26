// Google への呼び出しはこのファイルだけ（CLAUDE.md プライバシー 1）。使う URL は token と freeBusy の2つだけで、
// Calendar API は freebusy.query 以外を呼ばない（予定のタイトル等が構造的に取れない）
import type { Interval } from '../lib/busy'
import { toJstIso } from '../lib/time'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const FREEBUSY_URL = 'https://www.googleapis.com/calendar/v3/freeBusy'

export type Stage = 'config' | 'token' | 'freebusy'

// 失敗した段階と HTTP ステータスだけを持つ。レスポンス本文や ID は持たない（ログに出さないため）
export class GoogleError extends Error {
  constructor(
    readonly stage: Stage,
    readonly status?: number,
  ) {
    super(`google ${stage} failed`)
  }
}

export type Credentials = {
  clientId: string
  clientSecret: string
  refreshToken: string
}

// リフレッシュトークンからアクセストークンを取る。15分ごとに取り直すのでキャッシュしない（DESIGN.md §4-2）
export async function getAccessToken(
  creds: Credentials,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  let res: Response
  try {
    res = await fetchImpl(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        refresh_token: creds.refreshToken,
      }).toString(),
    })
  } catch {
    throw new GoogleError('token')
  }
  if (!res.ok) throw new GoogleError('token', res.status)
  const body: unknown = await res.json().catch(() => null)
  const token = (body as { access_token?: unknown } | null)?.access_token
  if (typeof token !== 'string' || token === '')
    throw new GoogleError('token', res.status)
  return token
}

// freeBusy のレスポンスで読むのはこれだけ。他のフィールドを読む余地を型に作らない（DESIGN.md §4-3）
type FreeBusyCalendar = {
  busy?: { start?: unknown; end?: unknown }[]
  errors?: unknown[]
}
type FreeBusyBody = { calendars?: Record<string, FreeBusyCalendar> }

export type FreeBusyResult = {
  intervals: Interval[] // 全カレンダーの区間を1つにまとめたもの（どのカレンダーかは分からない）
  okCount: number
  failedCount: number
}

// 全カレンダーを1リクエストで聞く。カレンダー単位の失敗（errors・返ってこない）はそのカレンダーだけ捨てる
export async function queryFreeBusy(
  accessToken: string,
  [timeMin, timeMax]: Interval,
  calendarIds: readonly string[],
  fetchImpl: typeof fetch = fetch,
): Promise<FreeBusyResult> {
  let res: Response
  try {
    res = await fetchImpl(FREEBUSY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin: toJstIso(timeMin),
        timeMax: toJstIso(timeMax),
        timeZone: 'Asia/Tokyo',
        items: calendarIds.map((id) => ({ id })),
      }),
    })
  } catch {
    throw new GoogleError('freebusy')
  }
  if (!res.ok) throw new GoogleError('freebusy', res.status)
  const body = (await res.json().catch(() => null)) as FreeBusyBody | null
  const calendars = body?.calendars ?? {}

  const intervals: Interval[] = []
  let okCount = 0
  for (const id of calendarIds) {
    const calendar = Object.hasOwn(calendars, id) ? calendars[id] : undefined
    if (!calendar || !Array.isArray(calendar.busy) || calendar.errors?.length)
      continue
    okCount++
    for (const { start, end } of calendar.busy) {
      if (typeof start !== 'string' || typeof end !== 'string') continue
      const s = Date.parse(start)
      const e = Date.parse(end)
      if (Number.isFinite(s) && Number.isFinite(e) && s < e)
        intervals.push([s, e])
    }
  }
  return { intervals, okCount, failedCount: calendarIds.length - okCount }
}
