import { Grid } from '@astryxdesign/core/Grid'
import { HStack } from '@astryxdesign/core/HStack'
import { VStack } from '@astryxdesign/core/VStack'
import type { WeekView } from '../lib/week'
import { AllDayRow } from './AllDayRow'
import { DayColumn } from './DayColumn'
import { DayHeader } from './DayHeader'
import { TimeLabels } from './TimeLabels'

type WeekGridProps = {
  view: WeekView
  todaySlot: number | null // 今日の現在時刻のマス（今日がこの週に無ければ null）
}

// Figma: WeekGrid（PC）。カードは境界線だけ（影なし）。時刻の列 + 7日の列
export function WeekGrid({ view, todaySlot }: WeekGridProps) {
  return (
    <VStack className="overflow-hidden rounded-lg border border-border bg-card">
      <HStack className="border-b border-border">
        <span className="w-calendar-time-column shrink-0" />
        <Grid columns={7} className="flex-1">
          {view.days.map((day) => (
            <DayHeader
              key={day.start}
              start={day.start}
              state={day.state}
              early={day.early}
            />
          ))}
        </Grid>
      </HStack>
      {view.hasAllDay && <AllDayRow days={view.days} />}
      <HStack>
        <TimeLabels />
        <Grid columns={7} className="flex-1">
          {view.days.map((day) => (
            <DayColumn
              key={day.start}
              day={day}
              nowSlot={day.state === 'today' ? todaySlot : null}
            />
          ))}
        </Grid>
      </HStack>
    </VStack>
  )
}
