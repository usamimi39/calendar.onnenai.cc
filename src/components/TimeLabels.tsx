import { Grid, GridSpan } from '@astryxdesign/core/Grid'
import { Text } from '@astryxdesign/core/Text'
import { GRID_START_HOUR, SLOTS_PER_DAY } from '../lib/busy'
import { formatHourLabel } from '../lib/format'
import { CALENDAR_SLOT_HEIGHT } from '../themes/onnenai/calendar'

// Figma: TimeLabels。1時間（2マス）ごとに、上端から 4px 下・中央に "8:00"〜"23:00"
export function TimeLabels() {
  return (
    <Grid
      columns={1}
      rowHeight={CALENDAR_SLOT_HEIGHT}
      className="w-calendar-time-column shrink-0"
      aria-hidden="true"
    >
      {Array.from({ length: SLOTS_PER_DAY / 2 }, (_, i) => (
        <GridSpan key={i} rows={2} className="pt-1 text-center">
          <Text type="supporting">{formatHourLabel(GRID_START_HOUR + i)}</Text>
        </GridSpan>
      ))}
    </Grid>
  )
}
