// cron（15分ごと）の本体: Google から取得 → 終日と時間指定に分ける → 丸め・マージ → KV に保存（DESIGN.md §4）
// - 全失敗・トークン失敗・HTTP エラーのときは書かない（前回の値が残る = フォールバック）
// - ログは段階・ステータス・件数だけ。ID・時刻・区間・エラー本文は出さない（CLAUDE.md プライバシー 5）
import { PUBLIC_DAYS, splitBusy } from '../lib/busy'
import type { Interval } from '../lib/busy'
import { DAY, startOfDayJST } from '../lib/time'
import { GoogleError, getAccessToken, queryFreeBusy } from './google'
import type { Stage } from './google'
import { BUSY_KEY } from './store'
import type { StoredBusy } from './store'

// 公開上限より1日広く取る。23:50 に取ったデータを 0:05 に配信しても翌日分が欠けないため
export const FETCH_DAYS = PUBLIC_DAYS + 1

export type RefreshResult =
  | { ok: true; okCount: number; failedCount: number }
  | { ok: false; stage: Stage; status?: number; failedCount?: number }

function parseIds(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}

function fail(result: Extract<RefreshResult, { ok: false }>): RefreshResult {
  console.error('refresh failed', {
    stage: result.stage,
    status: result.status,
    failedCount: result.failedCount,
  })
  return result
}

export async function refresh(
  env: Env,
  now: number = Date.now(),
  fetchImpl: typeof fetch = fetch,
): Promise<RefreshResult> {
  const ids = parseIds(env.CALENDAR_IDS)
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = env
  if (
    !ids.length ||
    !GOOGLE_CLIENT_ID ||
    !GOOGLE_CLIENT_SECRET ||
    !GOOGLE_REFRESH_TOKEN
  ) {
    return fail({ ok: false, stage: 'config' })
  }

  const today = startOfDayJST(now)
  const window: Interval = [today, today + FETCH_DAYS * DAY]

  try {
    const token = await getAccessToken(
      {
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        refreshToken: GOOGLE_REFRESH_TOKEN,
      },
      fetchImpl,
    )
    const { intervals, okCount, failedCount } = await queryFreeBusy(
      token,
      window,
      ids,
      fetchImpl,
    )
    if (okCount === 0)
      return fail({ ok: false, stage: 'freebusy', failedCount })

    const stored: StoredBusy = { generatedAt: now, ...splitBusy(intervals) }
    await env.BUSY_KV.put(BUSY_KEY, JSON.stringify(stored))

    // 一部だけ失敗（他アカウントの共有カレンダーが取れない等）は表示を続けるが、気づけるように件数だけ残す
    if (failedCount > 0)
      console.warn('refresh partial', { okCount, failedCount })
    return { ok: true, okCount, failedCount }
  } catch (err) {
    if (err instanceof GoogleError)
      return fail({ ok: false, stage: err.stage, status: err.status })
    throw err
  }
}
