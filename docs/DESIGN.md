# calendar.onnenai.cc — 設計書 v0.2

> v0.2（2026-11-26）: スタックとデザインシステムを onnenai.cc（`~/onnenai-portfolio`）に合わせた。Figma のたたき台を作成。

元仕様: `docs/SPEC.md`（以下「仕様」）。**優先順位: Figma（見た目・文言）> この設計書 > 仕様。**この設計書は仕様を実装レベルに落としたもの。仕様と食い違う箇所は **【決定】** として理由付きで明記する。

---

## 0. 仕様から修正・明確化した点（要確認）

| # | 仕様の記述 | 問題 | 【決定】（推奨案） |
|---|---|---|---|
| D1 | 「今日から 14 日間」と「月曜始まりの今週/来週」 | 月曜始まりだと今日が水曜なら今週の月火は過去、来週日曜は今日+11日。14日目までは表示されない。また「14日後 23:59」だと 15 日分になり「15日以上先は出さない」と矛盾 | **サーバーの絶対上限 = `[今日 00:00 JST, 今日+14日 00:00 JST)`**（ちょうど14日間）。グリッドは月曜始まりのまま、今日より前の日は「過去」としてグレーアウト（データは返さない）。週=1 は来週月〜日。結果的に上限より手前で終わるが、上限は将来の表示変更に備えた安全柵として残す |
| D2 | 「15 分キャッシュ（Cache API または KV）」「Google API は 15 分に 1 回まで」 | Cache API はデータセンター（colo）ごとに別。アクセス元が散ると colo の数だけ Google を叩くので「15分に1回」を保証できない | **Cron Trigger（15分毎）で取得 → KV に保存。リクエスト時は KV を読むだけ**。リクエスト経路から Google API を一切呼ばないので、レート制限・障害時フォールバック・レイテンシが全部自然に解決する |
| D3 | `CALENDAR_IDS` を環境変数に | `wrangler.jsonc` の `vars` に書くとリポジトリにメールアドレス・カレンダーIDが入る | **`CALENDAR_IDS` も Secret にする**（`wrangler secret put`）。ローカルは `.dev.vars`（gitignore） |
| D4 | Astro + Workers（構成自由） | onnenai.cc と揃えたい（ユーザー指示） | **onnenai.cc と同じスタック**: React 19 + Vite + TanStack Router（SPA）＋ Meta Astryx 0.7.11（固定）＋ Tailwind v4（Astryx ブリッジ）＋ Gen Interface JP。違いは自前 Worker（`/api/*` と cron）があることだけ。`@cloudflare/vite-plugin` で `pnpm dev` 1本に画面・Worker・KV をまとめる |
| D5 | OAuth リフレッシュトークン | OAuth 同意画面が「テスト」状態だとリフレッシュトークンが **7日で失効** する（よくハマる） | 同意画面を「本番環境」に公開する（未審査のままで自分1人なら利用可、警告画面が出るだけ）。README に明記 |

---

## 1. 全体構成

```
                ┌──────────── Cloudflare Worker: calendar-onnenai-cc ────────────┐
 Cron */15 ───▶ │ scheduled()                                                    │
                │   ├─ refresh token → access token (oauth2.googleapis.com)      │
                │   ├─ POST calendar/v3/freeBusy  (全カレンダー1リクエスト)       │──▶ Google
                │   ├─ normalize: 丸め → マージ（カレンダー区別を消す）            │
                │   └─ KV.put("busy:v1", {generatedAt, busy[]})  ※全失敗なら書かない│
                │                                                                │
 Browser ─────▶ │ fetch()                                                        │
   GET /        │   ├─ /api/busy?week=0|1 → KV.get → 現在時刻で範囲クリップ → JSON │
   GET /api/... │   └─ それ以外 → Static Assets（Vite の SPA ビルド）            │
                └────────────────────────────────────────────────────────────────┘
```

- KV は無料枠で十分（書き込み 96回/日、読み取りはアクセス数分）
- KV の結果整合性（最大〜60秒の伝播遅延）は 15 分更新に対して無視できる

## 2. リポジトリ構成

場所: `~/calendar.onnenai.cc`。**onnenai-portfolio の現状から切り出してベースにする**（共通パッケージにはしない。以後は別々に育てる）。

持ってくるもの: `package.json` の依存（同じバージョン）、`vite.config.ts`、`eslint` / `prettier` 設定、`scripts/token-guard.sh`、`src/styles/globals.css`、`src/themes/onnenai/`（＋カレンダー用 localTokens を追加）、`src/astryx-themes.ts`、`Header` / `Footer` / `ThemeToggle` / `ThemeMode` / `RouterLink` / `SunIcon`、`docs/TOKENS.md`、`CLAUDE.md`（カレンダー用に書き換え）。
持ってこないもの: works / personal / profile のコンテンツとルート、画像、`WorkCard` など。

```
calendar.onnenai.cc/
├─ CLAUDE.md / docs/SPEC.md / docs/TOKENS.md   # portfolio のルールを継承。SPEC = 元仕様 + この設計書
├─ vite.config.ts            # portfolio の設定 + @cloudflare/vite-plugin
├─ wrangler.jsonc
├─ .dev.vars.example         # 仕様の .env.example 相当（Workers の流儀）
├─ scripts/token-guard.sh    # portfolio から流用
├─ src/
│  ├─ main.tsx / router.tsx  # portfolio と同じ組み方（1行目 globals.css → <Theme> → RouterProvider）
│  ├─ routes/
│  │  ├─ __root.tsx          # Header / Footer
│  │  └─ index.tsx           # validateSearch で ?week=0|1、loader で /api/busy を取得
│  ├─ components/
│  │  ├─ Header.tsx Footer.tsx ThemeToggle.tsx …   # portfolio から（ナビは削除、Footer は Misskey のみ）
│  │  ├─ WeekSwitch.tsx      # Astryx SegmentedControl
│  │  ├─ WeekGrid.tsx        # PC: 週グリッド
│  │  ├─ DayHeader.tsx       # グリッドの日付見出し（Default / Today / Past、Early 目印）
│  │  ├─ DayColumn.tsx       # 1日の列（Grid + GridSpan で区間を積む）
│  │  ├─ NowLine.tsx         # 現在時刻の線
│  │  └─ DayList.tsx         # スマホ: 日ごとリスト（DayRow）
│  ├─ lib/
│  │  ├─ busy.ts             # 純粋関数: roundInterval, mergeIntervals, clipToWindow, weekWindow, toSegments
│  │  └─ time.ts             # JST ユーティリティ（Worker と画面で共用）
│  ├─ content/site.ts        # 見出し・説明文・Misskey URL（文章はここだけ）
│  ├─ worker/
│  │  ├─ index.ts            # fetch / scheduled のエントリ
│  │  ├─ google.ts           # getAccessToken(), queryFreeBusy()  ← Google 呼び出しはここだけ
│  │  ├─ refresh.ts          # cron の本体（取得→正規化→KV保存）
│  │  └─ api.ts              # /api/busy ハンドラ
│  ├─ themes/onnenai/        # portfolio のテーマ + calendar 用 localTokens
│  └─ styles/globals.css
├─ test/                     # vitest: busy / time / api / privacy
└─ fixtures/mock-busy.json
```

`wrangler.jsonc`（案）:

```jsonc
{
  "name": "calendar-onnenai-cc",
  "main": "src/worker/index.ts",
  "compatibility_date": "2026-11-01",
  "compatibility_flags": ["global_fetch_strictly_public"],
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*"]
  },
  "kv_namespaces": [{ "binding": "BUSY_KV", "id": "<作成後に記入>" }],
  "triggers": { "crons": ["*/15 * * * *"] },
  "vars": { "TIMEZONE": "Asia/Tokyo" },
  "routes": [{ "pattern": "calendar.onnenai.cc", "custom_domain": true }],
  "observability": { "enabled": true }   // console.log しない前提。リクエストメタ情報のみ残る
}
```

Secret: `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN` / `CALENDAR_IDS`

## 3. 時刻の扱い（`time.ts`）

- JST は DST なしの固定 UTC+9。**内部は全部 epoch ミリ秒**で計算し、Intl やライブラリは使わない
- 30 分丸めは UTC で計算しても JST と一致する（オフセットが30分の倍数なので）
  - `floor30(t) = Math.floor(t / 1_800_000) * 1_800_000`
  - `ceil30(t)  = Math.ceil (t / 1_800_000) * 1_800_000`
- `startOfDayJST(t) = floor((t + 9h) / 24h) * 24h - 9h`
- 出力は `toJstIso(t)` → `"2026-11-26T09:00:00+09:00"`（`new Date(t + 9h).toISOString()` の `Z` を `+09:00` に置換し、ミリ秒を落とす）
- `TIMEZONE` は表示用に保持するだけで、v1 では Asia/Tokyo 固定前提（他TZ対応は将来）

## 4. 取得と正規化（cron: `refresh.ts`）

1. `now` を取得。取得窓 = `[startOfDayJST(now), startOfDayJST(now) + 15日)`
   - 公開上限より **1 日広く** 取る。23:50 に取得したデータを 0:05 に配信しても翌日分が欠けないため（公開時に再クリップするので漏れない）
2. アクセストークン取得: `POST https://oauth2.googleapis.com/token`（`grant_type=refresh_token`）。15分毎に取り直してよい（キャッシュ不要）
3. `POST https://www.googleapis.com/calendar/v3/freeBusy`
   ```json
   { "timeMin": "...", "timeMax": "...", "timeZone": "Asia/Tokyo",
     "items": [{ "id": "<id1>" }, { "id": "<id2>" }, ...] }
   ```
   - 1 リクエストで全カレンダー分返る。カレンダー単位の失敗は `calendars[id].errors` に入る（例: `notFound`）→ **その ID を捨てて続行**
   - 使うフィールドは `calendars[*].busy[*].start/end` のみ。型定義もそれだけにして、他フィールドを読む余地をコード上に作らない
4. 正規化（`busy.ts`、全部純粋関数）
   1. 全カレンダーの区間を 1 配列に flatten（**この時点でカレンダーの区別を捨てる**）
   2. 各区間を `[floor30(start), ceil30(end))` に丸め
   3. start でソート → `next.start <= cur.end` なら結合（重なり＋隣接）
5. KV 保存判定
   - 成功カレンダー ≥ 1 → `KV.put("busy:v1", JSON.stringify({ generatedAt, busy }))`
   - 全失敗 / HTTP エラー / トークン失敗 → **書かない**（前回の値が残る＝フォールバック）
   - ログ: 失敗時に `console.error("refresh failed", { stage, status, failedCount })` 程度。**ID・時刻・区間は出さない**

保存形式は epoch ms の配列 `[[s,e],[s,e],...]` にして、ISO 化は配信時に行う（容量削減・クリップ計算が楽）。

## 5. 配信 API（`api.ts`）

`GET /api/busy?week=0|1`

1. `week` を検証: `"0"` / `"1"` 以外（未指定含む）→ **400**（`{ "error": "bad_request" }`）。黙って 0 にすると不正値を検知しにくいので 400 を推奨
2. 公開上限 `L = [startOfDayJST(now), startOfDayJST(now) + 14日)`
3. 週窓 `W`: 今日を含む週の月曜 00:00 JST + `week*7日` から 7日間
4. 返す窓 = `W ∩ L`（空になり得る。その場合 `busy: []`）
5. KV から読み、各区間を窓でクリップ（はみ出しは切り詰め、完全に外は捨てる）
6. レスポンス
   ```json
   {
     "timezone": "Asia/Tokyo",
     "generatedAt": "2026-11-25T10:00:00+09:00",
     "range": { "start": "2026-11-25T00:00:00+09:00", "end": "2026-11-30T00:00:00+09:00" },
     "busy": [{ "start": "...", "end": "..." }]
   }
   ```
   - `range` は仕様に無いが追加を推奨。フロントが「どこからどこまでが有効データか（過去日のグレーアウト範囲）」を自前で計算しなくて済む。情報としては日付のみで秘匿性に影響なし
7. KV が空（初回デプロイ直後など）→ **503** `{ "error": "unavailable" }` → 画面は「情報を取得できませんでした」
8. ヘッダー: `Cache-Control: public, max-age=60`、`Content-Type: application/json`、`X-Robots-Tag: noindex`

**レスポンス構築はホワイトリスト方式**（`{timezone, generatedAt, range, busy:[{start,end}]}` をリテラルで組み立てる）。KV の中身を spread しない。

## 6. フロントエンド

### 6.1 Figma（正）

ファイル: `onnenai.cc-systems（コピー）` `StaCqb5YymeoFNa003OPuA`

- 画面: Screens ページ `Calendar / Desktop`（node `2006:22436`）/ `Calendar / Mobile`（node `2006:22707`）
- 部品: Components ページ `Calendar/BusyBlock` `Calendar/NowLine` `Calendar/WeekSwitch`（+ `WeekSwitchItem`）`Calendar/DayHeader`（State=Default/Today/Past, Date, Weekday, Early）`Calendar/DayRow`（Date, Times, Today）
- 既存部品を流用: `Header`（Classic、ナビ非表示、サイト名 calendar.onnenai.cc）/ `Header/Mobile`（メニューボタン非表示）/ `Footer`（リンクは Misskey のみ）/ `Tag`（「今日」）

### 6.2 追加したトークン（Figma 変数 → テーマの localTokens）

| Figma | CSS 変数 | 値 |
|---|---|---|
| `red/500` `red/400`（Primitives） | — | #e5484d / #ff6b70 |
| `color/calendar/busy` | `--color-calendar-busy` | Light tianyi/400・Dark tianyi/500。塗り専用 |
| `color/calendar/now` | `--color-calendar-now` | Light red/500・Dark red/400 |
| `calendar/slot-height` | `--calendar-slot-height` | 24px（30分1マス） |
| `calendar/time-column-width` | `--calendar-time-column-width` | 56px |
| `calendar/now-line-width` | `--calendar-now-line-width` | 2px |
| `calendar/now-dot-size` | `--calendar-now-dot-size` | 8px |
| `calendar/block-gap` | `--calendar-block-gap` | 2px（予定ブロックの下の余白） |

`docs/TOKENS.md` にも対応する Tailwind 名（`bg-calendar-busy` など）を追記する。

### 6.3 週グリッドの組み方（ルール内で描く方法）

portfolio のルール（インライン style・任意値・StyleX 禁止）の中で時刻位置を表すため、**位置を計算せず「マス数」で積む**。

- 1日の列 = 8:00〜24:00 の 32 マス。`toSegments(day)` が `[{kind:'free',slots:4},{kind:'busy',slots:3},…]` を返し、`<Grid columns={1} rowHeight={SLOT}>` の中に `<GridSpan rows={n}>` を順に並べる
- 予定のマスは `GridSpan rows={n}` の中に BusyBlock を高さいっぱいに置き、マス側に下余白 `--calendar-block-gap` を付ける（Figma の `Busy ×n` フレームの paddingBottom と同じ）。ブロックの高さを `n × slot − 2` のように計算しない
- 列の中は3枚重ね（同じ grid-area に重ねる）: ① 1時間ごとの罫線（16 × `GridSpan rows={2}`）② 区間 ③ 現在時刻の線
- `rowHeight` は数値 prop なので、`--calendar-slot-height` と同じ値をテーマ由来の定数（`src/themes/onnenai` から export）で渡す。値の直書きはしない
- 過去日: 列を `bg-muted`、区間は描かない
- 8:00 より前の区間: 8:00 でクリップし、DayHeader の `Early`（「▲ 8時前あり」）を出す
- ブロックの上端左に「予定あり」だけを白（`--color-on-dark` = `text-on-dark`、text/supporting）で出す（2026-11-26 ユーザー指示。Figma の BusyBlock は未反映）。予定の中身は出さない。読み上げは `aria-label="11/26（木） 予定あり 09:00–10:30"` で、見た目の文字は `aria-hidden`。グリッド全体は視覚用とし、読み上げには DayList と同じ内容を `VisuallyHidden` で出すことも検討

### 6.4 現在時刻の線（fortee 風）

- 今日の列だけに出す。位置は **30 分単位**（`floor30(now)`）で、`GridSpan rows={k}` の空き + 線、で置く
- 1分ごとに `now` を更新し、30分の境目をまたいだら再描画（`useEffect` 内の `setInterval`。トップレベルで `window` に触らない）
- 0:00 をまたいだら loader を再実行（今日が変わるため）
- 8:00 前 / 範囲外の時間帯は線を出さない

### 6.5 スマホ（md 未満）

- `DayList`: 今日以降の日だけ `DayRow` で並べる。Times は `09:00–10:30 / 13:00–14:30`、無ければ「予定なし」（secondary）。今日は `Tag`「今日」
- 8:00 より前の区間もリストではそのまま出す（クリップはグリッド表示だけ）
- 週の切替はグリッドと共通（`?week=` の search param）

### 6.6 その他

- 見出し・説明文は Figma の確定版（2026-11-26 ユーザー修正）: タイトル「おんねのカレンダー」、説明「予定の詳細は公開していません。」（PC・スマホ共通）。仕様 §7 の仮タイトル・文案は使わない。文言は `src/content/site.ts` に置く

- ツールバー: WeekSwitch + 期間（`11/24（月）– 11/30（日）`）+ 最終更新。**最終更新は仕様の「フッター」からツールバー右端（スマホはリスト下）へ移した**（データの鮮度はデータの近くにある方が分かりやすいため）。Footer は Misskey リンクのみ
- ローディング: Astryx `Skeleton`、取得失敗: Astryx `EmptyState`「情報を取得できませんでした」（Figma にはまだ無い）
- ライト/ダーク: Astryx の `<Theme>`（portfolio と同じ）
- `<meta name="robots" content="noindex">`

### 6.7 開発時のモック

- `.dev.vars` に `MOCK=1` → `api.ts` が KV の代わりに `fixtures/mock-busy.json` を返す（Figma のたたき台と同じデータ）
- `@cloudflare/vite-plugin` により `pnpm dev` で画面と Worker が同時に動く（proxy 不要）

## 7. エラー処理まとめ

| 状況 | cron 側 | 配信側 / 画面 |
|---|---|---|
| 1カレンダー失敗（共有カレンダーなど） | その分を除外して保存 | 普通に表示。失敗は出さない |
| 全失敗 / Google ダウン / トークン失効 | 保存しない | 前回の KV を返す（generatedAt が古くなるだけ） |
| KV が空 | — | 503 → 「情報を取得できませんでした」 |
| `week` 不正 | — | 400 |

トークン失効に気づく手段: `generatedAt` が古いままになる。必要なら将来、cron 失敗が連続したら Misskey に通知（今回はやらない）。

## 8. OAuth セットアップ（README に書く内容）

1. Google Cloud Console でプロジェクト作成 → Google Calendar API を有効化
2. OAuth 同意画面: 外部 / スコープ `https://www.googleapis.com/auth/calendar.freebusy` のみ / テストユーザーに自分 → **「アプリを公開」で本番に**（D5）
   - 本番公開にはホームページ URL とプライバシーポリシー URL が必須（2026-11 時点の Google Auth Platform）。`https://calendar.onnenai.cc` と `https://calendar.onnenai.cc/privacy`（`src/routes/privacy.tsx`、文言は `src/content/site.ts` の `privacyText`）を使う
3. 認証情報 → OAuth クライアント ID（ウェブアプリ）、リダイレクト URI に `https://developers.google.com/oauthplayground`
4. OAuth Playground → 歯車で「Use your own OAuth credentials」→ スコープ欄に上記を手入力 → Authorize → Exchange → refresh_token を控える
5. `wrangler secret put GOOGLE_CLIENT_ID` …（4つ）
6. `wrangler kv namespace create BUSY_KV` → id を `wrangler.jsonc` に
7. `pnpm build && wrangler deploy` → 初回データは次の cron（≤15分）まで待つか、ダッシュボードから cron を手動実行
8. DNS: `routes.custom_domain: true` により deploy 時に `calendar.onnenai.cc` が自動作成される（手動の DNS レコード不要）

## 9. テスト・受け入れ確認

自動（vitest）:
- `roundInterval`: 09:10–10:05 → 09:00–10:30、ちょうど境界はそのまま
- `mergeIntervals`: 重なり・隣接（10:00 終了 / 10:00 開始）・包含・別カレンダー同時刻
- `clipToWindow`: 前日跨ぎ・上限跨ぎ・完全に外
- 週窓: 月曜/日曜/23:59/0:00 の境界、`W ∩ L` が空になるケース
- API: `week=2`, `week=-1`, `week=abc`, 未指定 → 400。返る区間が常に `L` 内
- プライバシー: レスポンス JSON のキー集合が許可リストと完全一致

手動（実データ、仕様 §9-5）:
- 終日予定 → 0:00〜翌0:00 で来るか（グリッドでは 8〜24 全面＋▲）
- 繰り返し予定 → FreeBusy が展開して返すか
- 他アカウント所有の共有カレンダーを `CALENDAR_IDS` に入れて実際に取れるか（取れなければ errors で除外されることの確認）
- `curl` でレスポンス・HTML を取り、カレンダー ID / メールアドレス / 予定名が出ないことを grep

コード確認: `grep -r "events" src/` で `events.list/get` が無いこと、Google への URL が `google.ts` の 2 つだけであること。

## 10. 実装ステップ（仕様 §9 を具体化）

1. 雛形: onnenai-portfolio から切り出し（§2）→ `@cloudflare/vite-plugin` / vitest 追加、`wrangler.jsonc` 作成、テーマに calendar の localTokens 追加 → `pnpm check` が通る状態に
2. `busy.ts` / `time.ts` を先に書いてテスト（ロジックの核なので最初に固める）
3. `api.ts` + モック → `pnpm dev` で Figma（§6.1）どおりに画面（グリッド＋リスト＋現在時刻の線）を完成
4. `google.ts` / `refresh.ts` / `scheduled` → `wrangler dev --test-scheduled` で `/cdn-cgi/handler/scheduled`（古い版は `/__scheduled`）を叩いて実データ確認
5. README / `.dev.vars.example`
6. deploy → `calendar.onnenai.cc` で確認、受け入れ条件チェック
