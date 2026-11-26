// Worker のエントリ（DESIGN.md §1）
// - fetch: /api/* だけがここに来る（wrangler.jsonc の run_worker_first）。それ以外は Static Assets（Vite の SPA ビルド）
// - scheduled: Cron（15分ごと）で Google から取得して KV に保存。リクエスト経路からは Google を呼ばない
import './env'
import { handleBusy } from './api'
import { refresh } from './refresh'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/api/busy') return handleBusy(request, env)
    if (url.pathname.startsWith('/api/')) {
      return Response.json(
        { error: 'not_found' },
        { status: 404, headers: { 'X-Robots-Tag': 'noindex' } },
      )
    }
    return env.ASSETS.fetch(request)
  },

  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(refresh(env))
  },
} satisfies ExportedHandler<Env>
