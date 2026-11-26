import type { Week } from './busy'
import type { BusyResponse } from './types'

// /api/busy を読む（画面の loader から）。失敗はまとめて例外にして、画面は「情報を取得できませんでした」だけを出す
export async function fetchBusy(
  week: Week,
  signal?: AbortSignal,
): Promise<BusyResponse> {
  const res = await fetch(`/api/busy?week=${week}`, { signal })
  if (!res.ok) throw new Error(`busy: ${res.status}`)
  return (await res.json()) as BusyResponse
}
