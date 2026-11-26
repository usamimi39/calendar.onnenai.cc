// ソースコードの静的チェック（CLAUDE.md プライバシー 1・5、SPEC §10「FreeBusy のみ」）
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = join(import.meta.dirname, '..')

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return files(path)
    return /\.(ts|tsx)$/.test(name) && name !== 'routeTree.gen.ts' ? [path] : []
  })
}

const sources = files(join(ROOT, 'src')).map((path) => ({
  path: relative(ROOT, path),
  text: readFileSync(path, 'utf8'),
}))

describe('Google の呼び出し', () => {
  // 数えるのは Google の API（*.googleapis.com）。/privacy の本文にあるポリシーへのリンク
  // （developers.google.com）は呼び出しではないので対象外。外への通信の有無は下の fetch のテストで見る
  it('Google API の URL は src/worker/google.ts の token と freeBusy の2つだけ', () => {
    const found = sources.flatMap(({ path, text }) =>
      [...text.matchAll(/https:\/\/[a-z0-9.-]*googleapis\.com[^\s'"`]*/g)].map(
        (m) => ({
          path,
          url: m[0],
        }),
      ),
    )
    expect(found).toEqual([
      {
        path: 'src/worker/google.ts',
        url: 'https://oauth2.googleapis.com/token',
      },
      {
        path: 'src/worker/google.ts',
        url: 'https://www.googleapis.com/calendar/v3/freeBusy',
      },
    ])
  })

  it('Calendar API の events.* を使っていない', () => {
    for (const { path, text } of sources) {
      expect(text, path).not.toMatch(
        /\/events\b|events\.(list|get|insert|watch|instances)/,
      )
    }
  })

  // Worker の `async fetch(` ハンドラーと `env.ASSETS.fetch(`（静的ファイル）は外への通信ではないので数えない
  it('fetch を呼ぶのは Google 連携（google.ts）と画面の /api/busy 読み込み（fetchBusy.ts）だけ', () => {
    const callers = sources
      .filter(({ text }) => /(?<!async |\.)\bfetch\(|fetchImpl\(/.test(text))
      .map(({ path }) => path)
      .sort()
    expect(callers).toEqual(['src/lib/fetchBusy.ts', 'src/worker/google.ts'])
  })
})

describe('ログ', () => {
  it('console.* を使うのは refresh.ts だけ', () => {
    const users = sources
      .filter(({ text }) => /console\./.test(text))
      .map(({ path }) => path)
    expect(users).toEqual(['src/worker/refresh.ts'])
  })
})
