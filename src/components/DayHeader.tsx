import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { calendarText } from '../content/site'
import { toDateAttr } from '../lib/format'
import { jstParts } from '../lib/time'
import type { DayState } from '../lib/week'

type DayHeaderProps = {
  start: number
  state: DayState
  early: boolean
}

// Figma: Calendar/DayHeader（State=Default/Today/Past、Early）
// 日付は heading/h3 相当（20px 太字）。Today は日付と曜日をアクセント色、Past は面を muted・文字を secondary
export function DayHeader({ start, state, early }: DayHeaderProps) {
  const { day, weekday } = jstParts(start)
  const dateColor =
    state === 'today' ? 'accent' : state === 'past' ? 'secondary' : 'primary'
  const weekdayColor = state === 'today' ? 'accent' : 'secondary'

  return (
    <VStack
      align="center"
      gap={1}
      className={`border-l border-border px-1 py-2 ${state === 'past' ? 'bg-muted' : ''}`}
    >
      <time dateTime={toDateAttr(start)}>
        <Text size="xl" weight="bold" color={dateColor}>
          {day}
        </Text>
      </time>
      <Text type="supporting" color={weekdayColor}>
        {calendarText.weekdays[weekday]}
      </Text>
      {early && <Text type="supporting">{calendarText.early}</Text>}
    </VStack>
  )
}
