import { Text } from '@astryxdesign/core/Text'
import { calendarText } from '../content/site'

// Figma: Calendar/BusyBlock。高さは親のマス（GridSpan）いっぱい
// 上端の左に「予定あり」を白（--color-on-dark）で出す（2026-11-26 ユーザー指示）。予定の中身は出さない
// 読み上げは aria-label（日付と時刻つき）に任せ、見た目の文字は読み上げない
export function BusyBlock({ label }: { label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className="h-full overflow-hidden rounded-sm bg-calendar-busy px-2 text-on-dark"
    >
      <Text
        type="supporting"
        color="inherit"
        display="block"
        maxLines={1}
        hasTruncateTooltip={false}
        aria-hidden="true"
      >
        {calendarText.busyLabel}
      </Text>
    </div>
  )
}
