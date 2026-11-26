// 週グリッドの寸法（Figma: Dimension / calendar/*）。値はここだけに置き、テーマの localTokens と
// Astryx の数値 prop（Grid rowHeight など、CSS 変数を受け取れないもの）の両方がここを読む（DESIGN.md §6.3）
export const CALENDAR_SLOT_HEIGHT = 24 // calendar/slot-height（30分 = 1マス）
export const CALENDAR_TIME_COLUMN_WIDTH = 56 // calendar/time-column-width
export const CALENDAR_NOW_LINE_WIDTH = 2 // calendar/now-line-width
export const CALENDAR_NOW_DOT_SIZE = 8 // calendar/now-dot-size
export const CALENDAR_BLOCK_GAP = 2 // calendar/block-gap（予定ブロックの下の余白）
