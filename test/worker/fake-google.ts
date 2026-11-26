// テスト用の偽 fetch。Google の token / freeBusy だけに答え、それ以外の URL が来たら落とす
export type Call = { url: string; init: RequestInit }

export type FakeOptions = {
  tokenStatus?: number
  freeBusyStatus?: number
  calendars?: Record<string, unknown>
}

export const TOKEN_URL = 'https://oauth2.googleapis.com/token'
export const FREEBUSY_URL = 'https://www.googleapis.com/calendar/v3/freeBusy'

export function fakeGoogle(options: FakeOptions = {}) {
  const calls: Call[] = []
  const fetchImpl = async (
    input: RequestInfo | URL,
    init: RequestInit = {},
  ) => {
    const url = String(input)
    calls.push({ url, init })
    if (url === TOKEN_URL) {
      const status = options.tokenStatus ?? 200
      return Response.json(
        status === 200
          ? { access_token: 'test-access-token', expires_in: 3599 }
          : { error: 'invalid_grant' },
        { status },
      )
    }
    if (url === FREEBUSY_URL) {
      const status = options.freeBusyStatus ?? 200
      return Response.json(
        status === 200
          ? { kind: 'calendar#freeBusy', calendars: options.calendars ?? {} }
          : { error: {} },
        { status },
      )
    }
    throw new Error(`unexpected URL: ${url}`)
  }
  return { calls, fetchImpl }
}

// 偽の KV（put / get だけ）
export function fakeKV(initial?: string) {
  const store = new Map<string, string>()
  if (initial !== undefined) store.set('busy:v1', initial)
  const puts: { key: string; value: string }[] = []
  const kv = {
    get: async (key: string, type?: string) => {
      const v = store.get(key)
      if (v === undefined) return null
      return type === 'json' ? JSON.parse(v) : v
    },
    put: async (key: string, value: string) => {
      puts.push({ key, value })
      store.set(key, value)
    },
  }
  return { kv: kv as unknown as KVNamespace, puts, store }
}
