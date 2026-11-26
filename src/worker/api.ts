// GET /api/busy?week=0〜MAX_WEEK（DESIGN.md §5）
// - 返す窓 = 週窓 W ∩ 公開上限 L（サーバーで強制。クライアントの値で広げられない）
// - レスポンスはホワイトリストでリテラルに組み立てる（KV の中身を spread しない）。キーは timezone / generatedAt / range / busy / allDay だけ
// - リクエスト経路から Google API は呼ばない（KV を読むだけ）
import { clipToWindow, isWeek, servedWindow } from '../lib/busy'
import type { Week } from '../lib/busy'
import { toJstIso } from '../lib/time'
import type { BusyResponse } from '../lib/types'
import { buildMock } from './mock'
import { readStored } from './store'
import type { StoredBusy } from './store'

export const TIMEZONE = 'Asia/Tokyo'

export type { BusyResponse }

const baseHeaders = { 'X-Robots-Tag': 'noindex' }

function json(body: unknown, status: number, headers: HeadersInit = {}) {
  return Response.json(body, {
    status,
    headers: { ...baseHeaders, ...headers },
  })
}

const errorResponse = (status: 400 | 503, error: string) =>
  json({ error }, status, { 'Cache-Control': 'no-store' })

// "0"〜"8"（MAX_WEEK）がちょうど1つだけのときだけ受け付ける。未指定・複数・"00"・" 1"・"1.0" などは全部 400
export function parseWeek(params: URLSearchParams): Week | null {
  const values = params.getAll('week')
  if (values.length !== 1 || !/^(0|[1-9]\d*)$/.test(values[0])) return null
  const week = Number(values[0])
  return isWeek(week) ? week : null
}

export function buildResponse(
  stored: StoredBusy,
  now: number,
  week: Week,
): BusyResponse {
  const window = servedWindow(now, week)
  return {
    timezone: TIMEZONE,
    generatedAt: toJstIso(stored.generatedAt),
    range: { start: toJstIso(window[0]), end: toJstIso(window[1]) },
    busy: clipToWindow(stored.busy, window).map(([s, e]) => ({
      start: toJstIso(s),
      end: toJstIso(e),
    })),
    allDay: clipToWindow(stored.allDay, window).map(([s, e]) => ({
      start: toJstIso(s),
      end: toJstIso(e),
    })),
  }
}

export async function handleBusy(
  request: Request,
  env: Env,
  now: number = Date.now(),
): Promise<Response> {
  const week = parseWeek(new URL(request.url).searchParams)
  if (week === null) return errorResponse(400, 'bad_request')

  const stored =
    env.MOCK === '1' ? buildMock(now) : await readStored(env.BUSY_KV)
  if (!stored) return errorResponse(503, 'unavailable')

  return json(buildResponse(stored, now, week), 200, {
    'Cache-Control': 'public, max-age=60',
  })
}
