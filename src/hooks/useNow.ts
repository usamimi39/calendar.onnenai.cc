import { useEffect, useState } from 'react'
import { floor30, MINUTE } from '../lib/time'

// 現在時刻を30分単位で持つ（DESIGN.md §6.4）。1分ごとに確かめ、30分の境目をまたいだときだけ再描画される
// window に触るのは useEffect の中だけ（CLAUDE.md デザインシステム 11）
export function useNow30(): number {
  const [now, setNow] = useState(() => floor30(Date.now()))
  useEffect(() => {
    const id = setInterval(() => setNow(floor30(Date.now())), MINUTE)
    return () => clearInterval(id)
  }, [])
  return now
}
