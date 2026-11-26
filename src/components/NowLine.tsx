import { HStack } from '@astryxdesign/core/HStack'

// Figma: Calendar/NowLine（fortee 風）。丸と線を --color-calendar-now で塗る
// 置かれたマスの上端が現在時刻（30分単位）。丸の半分（4px = spacing/1）だけ上にずらして中心を境目に合わせる
export function NowLine() {
  return (
    <HStack align="center" className="-translate-y-1" aria-hidden="true">
      <span className="size-calendar-now-dot shrink-0 rounded-full bg-calendar-now" />
      <span className="h-calendar-now-line flex-1 bg-calendar-now" />
    </HStack>
  )
}
