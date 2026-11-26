import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import type { Week } from '../lib/busy'
import { formatPeriod, formatUpdated } from '../lib/format'
import { WeekSwitch } from './WeekSwitch'

type CalendarToolbarProps = {
  week: Week
  onWeekChange: (week: Week) => void
  first: number // 月曜 0:00
  last: number // 日曜 0:00
  generatedAt?: number // 読み込み中は無い
}

// Figma: Toolbar。PC は「週切替・期間（曜日つき）・…・最終更新」、スマホは「週切替・…・期間（日付だけ）」
// スマホの最終更新はリストの下（CalendarUpdated）
export function CalendarToolbar({
  week,
  onWeekChange,
  first,
  last,
  generatedAt,
}: CalendarToolbarProps) {
  return (
    <HStack align="center" gap={4}>
      <WeekSwitch week={week} onChange={onWeekChange} />
      <Text type="label" className="hidden md:inline">
        {formatPeriod(first, last, true)}
      </Text>
      <span className="flex-1" />
      <Text type="label" className="md:hidden">
        {formatPeriod(first, last, false)}
      </Text>
      {generatedAt !== undefined && (
        <Text type="supporting" className="hidden md:inline">
          <time dateTime={new Date(generatedAt).toISOString()}>
            {formatUpdated(generatedAt)}
          </time>
        </Text>
      )}
    </HStack>
  )
}

// スマホ用: リストの下の最終更新
export function CalendarUpdated({ generatedAt }: { generatedAt: number }) {
  return (
    <Text type="supporting" display="block" className="md:hidden">
      <time dateTime={new Date(generatedAt).toISOString()}>
        {formatUpdated(generatedAt)}
      </time>
    </Text>
  )
}
