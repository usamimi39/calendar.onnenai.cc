// wrangler types は Secret と .dev.vars の値を知らないので、ここで Env に足す（値はリポジトリに置かない。CLAUDE.md プライバシー 4）
declare global {
  interface Env {
    GOOGLE_CLIENT_ID?: string
    GOOGLE_CLIENT_SECRET?: string
    GOOGLE_REFRESH_TOKEN?: string
    CALENDAR_IDS?: string // カンマ区切り
    MOCK?: string // "1" で /api/busy が fixtures/mock-busy.json を返す（ローカル開発専用）
  }
}

export {}
