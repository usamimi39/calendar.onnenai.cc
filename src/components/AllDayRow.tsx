import { Grid } from '@astryxdesign/core/Grid'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { calendarText } from '../content/site'
import { formatDateWithWeekday } from '../lib/format'
import type { DayView } from '../lib/week'

// PC の週グリッドの、日付見出しのすぐ下の終日の行（Google カレンダーの終日欄に相当）。Figma には無い（2026-11-26 ユーザー指示）
// その週に終日予定がある日だけバーを出す。見た目は予定ブロックと同じ（水色の塗り・白文字・上端左寄せ）
export function AllDayRow({ days }: { days: DayView[] }) {
  return (
    <HStack className="border-b border-border">
      <span className="w-calendar-time-column shrink-0" />
      <Grid columns={7} className="flex-1">
        {days.map((day) => (
          <VStack
            key={day.start}
            className={`border-l border-border p-1 ${day.state === 'past' ? 'bg-muted' : ''}`}
          >
            {day.allDay && (
              <AllDayBar
                label={`${formatDateWithWeekday(day.start)} ${calendarText.allDayLabel}`}
              />
            )}
          </VStack>
        ))}
      </Grid>
    </HStack>
  )
}

function AllDayBar({ label }: { label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className="rounded-sm bg-calendar-busy px-2 text-on-dark"
    >
      <Text
        type="supporting"
        color="inherit"
        display="block"
        maxLines={1}
        hasTruncateTooltip={false}
        aria-hidden="true"
      >
        {calendarText.allDayLabel}
      </Text>
    </div>
  )
}
