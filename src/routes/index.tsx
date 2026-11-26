import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { VStack } from '@astryxdesign/core/VStack'
import { CalendarToolbar, CalendarUpdated } from '../components/CalendarToolbar'
import { CalendarError, CalendarSkeleton } from '../components/CalendarStatus'
import { Container } from '../components/Container'
import { DayList } from '../components/DayList'
import { calendarText } from '../content/site'
import { PageHeader } from '../components/PageHeader'
import { WeekGrid } from '../components/WeekGrid'
import { useNow30 } from '../hooks/useNow'
import { weekWindow } from '../lib/busy'
import type { Week } from '../lib/busy'
import { fetchBusy } from '../lib/fetchBusy'
import { DAY, startOfDayJST } from '../lib/time'
import { buildWeek, nowSlot } from '../lib/week'

type Search = { week: Week }

export const Route = createFileRoute('/')({
  // 表示する週は ?week=0|1。それ以外は今週にする（範囲の制限はサーバーが強制する）
  validateSearch: (search: Record<string, unknown>): Search => ({
    week: search.week === 1 || search.week === '1' ? 1 : 0,
  }),
  loaderDeps: ({ search }) => ({ week: search.week }),
  loader: async ({ deps, abortController }) => ({
    data: await fetchBusy(deps.week, abortController.signal),
    // 読み込んだ日（JST）。日付が変わったら loader を再実行する
    loadedDay: startOfDayJST(Date.now()),
  }),
  component: CalendarPage,
  pendingComponent: CalendarPending,
  errorComponent: CalendarFailed,
})

function useWeekNavigation() {
  const navigate = useNavigate({ from: Route.fullPath })
  return (week: Week) => navigate({ search: { week } })
}

// ページの枠（見出し・ツールバー・中身）。読み込み中・失敗も同じ枠に入れる
function CalendarLayout({
  week,
  generatedAt,
  children,
}: {
  week: Week
  generatedAt?: number
  children: ReactNode
}) {
  const now = useNow30()
  const onWeekChange = useWeekNavigation()
  const [first] = weekWindow(now, week)

  return (
    <>
      <PageHeader
        title={calendarText.title}
        description={calendarText.description}
      />
      <Container className="pb-12 md:pb-16">
        <VStack gap={4}>
          <CalendarToolbar
            week={week}
            onWeekChange={onWeekChange}
            first={first}
            last={first + 6 * DAY}
            generatedAt={generatedAt}
          />
          {children}
        </VStack>
      </Container>
    </>
  )
}

function CalendarPage() {
  const { week } = Route.useSearch()
  const { data, loadedDay } = Route.useLoaderData()
  const router = useRouter()
  const now = useNow30()

  // 0:00 をまたいだら今日が変わるので、データを取り直す（DESIGN.md §6.4）
  useEffect(() => {
    if (startOfDayJST(now) !== loadedDay) void router.invalidate()
  }, [now, loadedDay, router])

  const view = buildWeek(data, now, week)
  const today = startOfDayJST(now)

  return (
    <CalendarLayout week={week} generatedAt={view.generatedAt}>
      <div className="hidden md:block">
        <WeekGrid view={view} todaySlot={nowSlot(today, now)} />
      </div>
      <VStack gap={4} className="md:hidden">
        <DayList days={view.days} />
        <CalendarUpdated generatedAt={view.generatedAt} />
      </VStack>
    </CalendarLayout>
  )
}

function CalendarPending() {
  const { week } = Route.useSearch()
  return (
    <CalendarLayout week={week}>
      <CalendarSkeleton />
    </CalendarLayout>
  )
}

function CalendarFailed() {
  const { week } = Route.useSearch()
  return (
    <CalendarLayout week={week}>
      <CalendarError />
    </CalendarLayout>
  )
}
