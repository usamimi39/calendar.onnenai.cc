import { Fragment } from 'react'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { calendarText } from '../content/site'
import {
  formatDateWithWeekday,
  formatTimeRange,
  toDateAttr,
} from '../lib/format'
import type { DayView } from '../lib/week'
import { Tag } from './Tag'

// Figma: DayList（スマホ）。今日以降の日だけを Calendar/DayRow で並べる（DESIGN.md §6.5）
// 8:00 より前の区間もそのまま出す（クリップはグリッドだけ）
export function DayList({ days }: { days: DayView[] }) {
  return (
    <VStack
      as="ul"
      className="overflow-hidden rounded-lg border border-border bg-card"
    >
      {days
        .filter((day) => day.state !== 'past')
        .map((day) => (
          <DayRow key={day.start} day={day} />
        ))}
    </VStack>
  )
}

// Figma: Calendar/DayRow（Date, Times, Today）。区間なしは「予定なし」を secondary で
function DayRow({ day }: { day: DayView }) {
  // 折り返すのは " / " の所だけ（"19:00–" と "21:00" の間で切らない）
  // 終日予定があれば先頭に「終日予定あり」（その日の時間指定の予定は続けて出す）
  const times = [
    ...(day.allDay ? [calendarText.allDayLabel] : []),
    ...day.busy.map(([s, e]) => formatTimeRange(s, e, day.start)),
  ]

  return (
    <VStack
      as="li"
      gap={1}
      className="border-b border-border px-4 py-3 last:border-b-0"
    >
      <HStack align="center" gap={2}>
        <Text type="label">
          <time dateTime={toDateAttr(day.start)}>
            {formatDateWithWeekday(day.start)}
          </time>
        </Text>
        {day.state === 'today' && <Tag label={calendarText.today} />}
      </HStack>
      <Text
        as="p"
        display="block"
        color={times.length ? 'primary' : 'secondary'}
      >
        {times.length
          ? times.map((range, i) => (
              <Fragment key={range}>
                {i > 0 && ' / '}
                <span className="whitespace-nowrap">{range}</span>
              </Fragment>
            ))
          : calendarText.noBusy}
      </Text>
    </VStack>
  )
}
