// /api/busy のレスポンス（DESIGN.md §5）。Worker と画面で共用する。ここにないキーは返さない
export type BusyResponse = {
  timezone: string
  generatedAt: string
  range: { start: string; end: string }
  busy: { start: string; end: string }[] // 時間指定の区間
  allDay: { start: string; end: string }[] // 終日の区間（0:00 始まり・丸 n 日）
}
