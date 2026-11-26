import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl'
import type { Week } from '../lib/busy'
import { calendarText } from '../content/site'

type WeekSwitchProps = {
  week: Week
  onChange: (week: Week) => void
}

// Figma: Calendar/WeekSwitch（実装は Astryx SegmentedControl）
export function WeekSwitch({ week, onChange }: WeekSwitchProps) {
  return (
    <SegmentedControl
      label={calendarText.weekSwitchLabel}
      value={String(week)}
      onChange={(value) => onChange(value === '1' ? 1 : 0)}
    >
      <SegmentedControlItem value="0" label={calendarText.weeks[0]} />
      <SegmentedControlItem value="1" label={calendarText.weeks[1]} />
    </SegmentedControl>
  )
}
