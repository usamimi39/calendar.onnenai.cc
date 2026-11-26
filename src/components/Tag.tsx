import { Text } from '@astryxdesign/core/Text'

// 小ラベル（Figma: Tag）。スマホの日ごとリストの「今日」に使う
// Astryx の Badge は数の表示専用なので使わない
export function Tag({ label }: { label: string }) {
  return (
    <Text
      type="supporting"
      display="block"
      className="rounded-full bg-muted px-3 py-1"
    >
      {label}
    </Text>
  )
}
