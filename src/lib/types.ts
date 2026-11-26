// /api/busy のレスポンス（DESIGN.md §5）。Worker と画面で共用する。ここにないキーは返さない
export type BusyResponse = {
  timezone: string
  generatedAt: string
  range: { start: string; end: string }
  busy: { start: string; end: string }[]
}
