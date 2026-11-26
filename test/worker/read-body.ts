import type { BusyResponse } from '../../src/worker/api'

// Workers の型では Response.json() が unknown を返すので、テストでは成功時の形として読む
export async function readBody(res: Response): Promise<BusyResponse> {
  return res.json<BusyResponse>()
}
