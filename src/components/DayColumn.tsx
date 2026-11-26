import { Grid, GridSpan } from '@astryxdesign/core/Grid'
import { calendarText } from '../content/site'
import { SLOTS_PER_DAY } from '../lib/busy'
import { formatDateWithWeekday, formatTimeRange } from '../lib/format'
import type { DayView } from '../lib/week'
import { CALENDAR_SLOT_HEIGHT } from '../themes/onnenai/calendar'
import { BusyBlock } from './BusyBlock'
import { NowLine } from './NowLine'

const HOURS = SLOTS_PER_DAY / 2 // 16

type DayColumnProps = {
  day: DayView
  nowSlot: number | null // 今日の列だけ。8:00 から何マス目か
}

// 30分 = 1マスの Grid を同じ場所に3枚重ねる（DESIGN.md §6.3）: ① 1時間ごとの罫線 ② 区間 ③ 現在時刻の線
// 位置は計算せず、GridSpan rows={マス数} を順に積む
export function DayColumn({ day, nowSlot }: DayColumnProps) {
  const dateLabel = formatDateWithWeekday(day.start)

  return (
    <Grid
      columns={1}
      className={`overflow-hidden border-l border-border ${day.state === 'past' ? 'bg-muted' : ''}`}
    >
      <Grid
        columns={1}
        rowHeight={CALENDAR_SLOT_HEIGHT}
        className="col-start-1 row-start-1"
      >
        {Array.from({ length: HOURS }, (_, i) => (
          <GridSpan
            key={i}
            rows={2}
            className={i > 0 ? 'border-t border-border' : ''}
          />
        ))}
      </Grid>

      <Grid
        columns={1}
        rowHeight={CALENDAR_SLOT_HEIGHT}
        className="col-start-1 row-start-1 px-1"
      >
        {day.segments.map((segment, i) =>
          segment.kind === 'free' ? (
            <GridSpan key={i} rows={segment.slots} />
          ) : (
            <GridSpan
              key={i}
              rows={segment.slots}
              className="pb-calendar-block-gap"
            >
              <BusyBlock
                label={`${dateLabel} ${calendarText.busyLabel} ${formatTimeRange(segment.start, segment.end, day.start)}`}
              />
            </GridSpan>
          ),
        )}
      </Grid>

      {nowSlot !== null && (
        <Grid
          columns={1}
          rowHeight={CALENDAR_SLOT_HEIGHT}
          className="col-start-1 row-start-1"
        >
          {nowSlot > 0 && <GridSpan rows={nowSlot} />}
          <GridSpan rows={1}>
            <NowLine />
          </GridSpan>
        </Grid>
      )}
    </Grid>
  )
}
