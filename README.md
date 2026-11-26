# calendar.onnenai.cc

Google カレンダーから「埋まっている時間帯だけ」を公開するページ。予定のタイトル・場所・参加者・カレンダー名は取得も表示もしない。

- 設計: [docs/DESIGN.md](docs/DESIGN.md)（元仕様: [docs/SPEC.md](docs/SPEC.md)、見た目の正は Figma）
- 作業ルール: [CLAUDE.md](CLAUDE.md)

## 仕組み

```
Cron（15分ごと） → Worker scheduled() → Google FreeBusy API → 丸め・マージ → KV（busy:v1）
ブラウザ → GET /api/busy?week=0|1 → Worker が KV を読んで、今日〜14日の範囲に切って返す
```

- Google の API は `freebusy.query` だけを使う（`src/worker/google.ts`）。FreeBusy は開始・終了時刻しか返さないので、予定の中身は構造的に取れない
- リクエストから Google を呼ぶことはない。Google が落ちている・トークンが切れているときは、前回の KV の値を返し続ける（「最終更新」が古くなるだけ）
- 表示範囲（今日 0:00〜14日後 0:00、週は今週・来週の2択）はサーバーで強制する

## 開発

Node 22 以上と pnpm を使う。

```sh
pnpm install
cp .dev.vars.example .dev.vars   # MOCK=1 を入れるとモックデータで画面を作れる
pnpm dev                         # http://localhost:3000（画面と Worker・KV が同時に動く）
```

| コマンド           | 内容                                                           |
| ------------------ | -------------------------------------------------------------- |
| `pnpm dev`         | 開発サーバー                                                   |
| `pnpm test`        | vitest                                                         |
| `pnpm check`       | 型チェック + lint + `scripts/token-guard.sh` + `astryx doctor` |
| `pnpm build`       | ビルド（`dist/client` と Worker）                              |
| `pnpm theme:build` | テーマ（`src/themes/onnenai/onnenaiTheme.ts`）を変えたら実行   |
| `pnpm cf-typegen`  | `wrangler.jsonc` を変えたら実行                                |

`.dev.vars` の `MOCK=1` は `/api/busy` だけに効く（KV の代わりに `fixtures/mock-busy.json` を今日の日付に当てはめて返す）。cron は MOCK に関係なく動く。

## Google OAuth のセットアップ（最初に1回）

サービスアカウントは使えない（他アカウント所有の共有カレンダーをサービスアカウントに共有できないため）。カレンダーの持ち主のアカウントで OAuth を通し、リフレッシュトークンを Worker に持たせる。

### 1. Google Cloud のプロジェクト

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作る
2. 「API とサービス」→「ライブラリ」で **Google Calendar API** を有効にする

### 2. OAuth 同意画面

1. 「API とサービス」→「OAuth 同意画面」（Google Auth Platform）
2. ユーザーの種類は **外部**。「ブランディング」でアプリ名・サポートメールのほかに、**ホームページ URL（`https://calendar.onnenai.cc`）とプライバシーポリシー URL（`https://calendar.onnenai.cc/privacy`）** を入れ、承認済みドメインに `onnenai.cc` を追加する。この2つの URL が空だと、手順 5 の「アプリを公開」が押せない（審査を受けない個人利用でも必須）
3. スコープ（「データアクセス」）に **`https://www.googleapis.com/auth/calendar.freebusy` だけ** を追加する。他のスコープは足さない
4. テストユーザーに自分のアカウントを追加する
5. **「アプリを公開」で公開ステータスを「本番環境」にする**

> **重要:** 「テスト」のままだと、リフレッシュトークンが **7日で失効** して、ページの更新が止まる。本番環境にしても、審査を受けていない間は自分で使うぶんには問題ない（ログイン時に「Google はこのアプリを確認していません」と出るので「詳細」→「（安全ではないページ）に移動」で進む）。

### 3. OAuth クライアント ID

1. 「API とサービス」→「認証情報」→「認証情報を作成」→「OAuth クライアント ID」
2. 種類は **ウェブ アプリケーション**
3. 承認済みのリダイレクト URI に `https://developers.google.com/oauthplayground` を追加
4. 作成後に出る **クライアント ID** と **クライアント シークレット** を控える

### 4. リフレッシュトークンを取る（OAuth Playground）

1. [OAuth 2.0 Playground](https://developers.google.com/oauthplayground) を開く
2. 右上の歯車 → **Use your own OAuth credentials** にチェックし、3. のクライアント ID とシークレットを入れる
3. 左の「Step 1」の入力欄に `https://www.googleapis.com/auth/calendar.freebusy` を手で入れて **Authorize APIs**
4. カレンダーの持ち主のアカウントでログインして許可する
5. 「Step 2」で **Exchange authorization code for tokens** → 表示された **Refresh token** を控える

使い終わったら、Playground の歯車から認証情報を消しておく。リフレッシュトークンはパスワードと同じ扱いで、どこにも貼らない。

### 5. カレンダー ID

[Google カレンダーの設定](https://calendar.google.com/calendar/r/settings) → 各カレンダー →「カレンダーの統合」の **カレンダー ID** を控える。メインのカレンダーはメールアドレスがそのまま ID。
他のアカウントのカレンダーは、そのアカウントから自分に「予定の表示（時間枠のみ）」以上で共有されていれば FreeBusy で取れる。取れないカレンダーは自動で除外され、他のカレンダーは普通に表示される。

## ローカルで実データを確かめる

`.dev.vars` に値を入れる（このファイルは gitignore 済み。値をほかのファイルに書かない）。

```sh
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
CALENDAR_IDS=id1,id2,id3,id4
MOCK=                       # 実データを見るときは空にする
```

```sh
pnpm dev
# 別のターミナルで cron を1回動かす（ローカルの KV に保存される）
curl "http://localhost:3000/cdn-cgi/handler/scheduled?cron=*/15+*+*+*+*"
# 結果を見る
curl "http://localhost:3000/api/busy?week=0"
```

`pnpm dev` のログに `refresh failed { stage, status, failedCount }` が出たら失敗（`config` = .dev.vars の値が足りない、`token` = クライアント情報かリフレッシュトークンが違う、`freebusy` = Calendar API が無効・全カレンダー失敗）。`refresh partial` は一部のカレンダーだけ取れなかったときに出る。ログには ID や時刻は出ない。

ビルド後の Worker で試す場合は `pnpm build && pnpm exec wrangler dev -c dist/calendar_onnenai_cc/wrangler.json --test-scheduled` を起動し、`http://localhost:8787/cdn-cgi/handler/scheduled` を叩く。この方法では `.dev.vars` はビルド時に `dist/` へコピーされたものが使われるので、値を変えたらビルドし直す。

## デプロイ

以下は Cloudflare のアカウントに変更を加えるので、1つずつ確認しながら進める。

### 1. KV namespace を作る

```sh
pnpm exec wrangler kv namespace create BUSY_KV
```

出てきた `id` を `wrangler.jsonc` の `kv_namespaces[0].id`（いまは `"local-dev"`）に書き換え、`pnpm cf-typegen` を実行する。KV の id は秘密情報ではない。

### 2. Secret を登録する

```sh
pnpm exec wrangler secret put GOOGLE_CLIENT_ID
pnpm exec wrangler secret put GOOGLE_CLIENT_SECRET
pnpm exec wrangler secret put GOOGLE_REFRESH_TOKEN
pnpm exec wrangler secret put CALENDAR_IDS        # カンマ区切り
```

値はプロンプトに貼る（コマンドラインの引数やファイルには書かない）。`MOCK` は本番に登録しない。

### 3. デプロイする

```sh
pnpm deploy
```

`wrangler.jsonc` の `routes`（`custom_domain: true`）により、`calendar.onnenai.cc` の DNS レコードと証明書はデプロイ時に自動で作られる（手動の DNS 設定は不要。`onnenai.cc` のゾーンが同じ Cloudflare アカウントにあること）。

デプロイ直後は KV が空なので、ページは「情報を取得できませんでした」になる。次の cron（最大15分後）を待つか、Cloudflare ダッシュボードの Workers → calendar-onnenai-cc →「設定」→「トリガー」→ Cron の横から手動で実行する。

### 動いているかの確かめ方

- ページの「最終更新」が15分以内であること。古いまま進まないときは、トークン失効（同意画面がテストのまま、パスワード変更、アクセス権の取り消しなど）を疑い、4. からリフレッシュトークンを取り直して `wrangler secret put GOOGLE_REFRESH_TOKEN` する
- ログは Cloudflare ダッシュボードの Workers → calendar-onnenai-cc →「ログ」（Observability）で見られる
