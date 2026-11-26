import { Button } from '@astryxdesign/core/Button'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { IconButton } from '@astryxdesign/core/IconButton'
import { calendarText } from '../content/site'
import { MAX_WEEK } from '../lib/busy'
import type { Week } from '../lib/busy'

type WeekNavProps = {
  week: Week
  onChange: (week: Week) => void
}

// 週送り「‹ 今週 ›」。今週（0）から MAX_WEEK 週先まで。端では矢印を押せない
// Figma には無い（2026-11-26 ユーザー指示。「今週/来週」の SegmentedControl から置き換え）
export function WeekNav({ week, onChange }: WeekNavProps) {
  return (
    <HStack
      as="nav"
      aria-label={calendarText.weekNavLabel}
      align="center"
      gap={1}
    >
      <IconButton
        variant="ghost"
        label={calendarText.prevWeek}
        icon={<Icon icon="chevronLeft" />}
        isDisabled={week <= 0}
        onClick={() => onChange(week - 1)}
        className="rounded-full"
      />
      <Button
        variant="secondary"
        size="sm"
        label={calendarText.thisWeek}
        isDisabled={week === 0}
        onClick={() => onChange(0)}
        className="rounded-full"
      />
      <IconButton
        variant="ghost"
        label={calendarText.nextWeek}
        icon={<Icon icon="chevronRight" />}
        isDisabled={week >= MAX_WEEK}
        onClick={() => onChange(week + 1)}
        className="rounded-full"
      />
    </HStack>
  )
}
