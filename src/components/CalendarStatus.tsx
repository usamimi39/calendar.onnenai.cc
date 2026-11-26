import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { VStack } from '@astryxdesign/core/VStack'
import { calendarText } from '../content/site'
import { SLOTS_PER_DAY } from '../lib/busy'
import { CALENDAR_SLOT_HEIGHT } from '../themes/onnenai/calendar'

// 読み込み中（Astryx Skeleton）。Figma に無いので、PC は週グリッドの本体と同じ高さ、スマホはその半分の塊にする
export function CalendarSkeleton() {
  return (
    <>
      <VStack className="hidden md:flex">
        <Skeleton height={CALENDAR_SLOT_HEIGHT * SLOTS_PER_DAY} radius={4} />
      </VStack>
      <VStack className="md:hidden">
        <Skeleton
          height={(CALENDAR_SLOT_HEIGHT * SLOTS_PER_DAY) / 2}
          radius={4}
        />
      </VStack>
    </>
  )
}

// 取得失敗（Astryx EmptyState）。詳細なエラーは出さない（SPEC §8）
export function CalendarError() {
  return (
    <VStack className="rounded-lg border border-border bg-card py-16">
      <EmptyState title={calendarText.error} headingLevel={2} />
    </VStack>
  )
}
