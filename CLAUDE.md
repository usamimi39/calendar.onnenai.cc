# CLAUDE.md

運営者の Google カレンダーから「埋まっている時間帯だけ」を公開するページ（calendar.onnenai.cc）。
React + Vite + TanStack Router の SPA ＋ Cloudflare Worker（`/api/*` と cron）。テーマ・部品・レイアウトは Meta Astryx、微調整は Tailwind（Astryx の Tailwind ブリッジ経由）。スタックとデザインシステムは onnenai.cc（`~/onnenai-portfolio`）から切り出したもの。

## ドキュメントと優先順位

- 見た目・文言の正: Figma「onnenai.cc-systems（コピー）」 fileKey `StaCqb5YymeoFNa003OPuA`
  - 画面: Screens ページ `Calendar / Desktop`（`2006:22436`）/ `Calendar / Mobile`（`2006:22707`）
  - 部品: Components ページの `Calendar/*`、既存の `Header` / `Header/Mobile` / `Footer` / `Tag`
- 実装の正: `docs/DESIGN.md`（設計書）
- 要件の出どころ: `docs/SPEC.md`（元仕様）

**Figma > DESIGN.md > SPEC.md** の順に優先する。書いていない判断が必要になったら、推測で進めずユーザーに聞く。
onnenai-portfolio の `CLAUDE.md` / `docs/SPEC.md` は「切り出し元」として参照してよいが、このリポジトリのルールはこのファイルが正。

## 絶対に守ること（プライバシー）

DESIGN.md / SPEC.md §3 の要約。破るくらいなら止めて聞く。

1. Google Calendar API は **FreeBusy（`freebusy.query`）だけ** を使う。`events.*` は呼ばない。Google への URL は `src/worker/google.ts` の token エンドポイントと freeBusy の 2 つだけ
2. `/api/busy` のレスポンスはホワイトリストで組み立てる（`timezone` `generatedAt` `range` `busy[{start,end}]` のみ）。カレンダー名・ID・カレンダーごとの区別を出さない
3. 表示範囲はサーバーで強制する（`[今日 00:00 JST, +14日)`、`week` は `0|1` のみ、それ以外は 400）
4. 認証情報とカレンダー ID はリポジトリに入れない。Secret（`wrangler secret put`）とローカルの `.dev.vars`（gitignore）だけ。ドキュメントやテスト、fixture にも実 ID を書かない
5. 予定の時刻・カレンダー ID を `console.*` に出さない。エラーログは段階・ステータス・件数だけ
6. リクエスト経路から Google API を呼ばない（cron → KV、リクエストは KV を読むだけ）

## デザインシステムのルール（onnenai.cc から継承）

1. **テーマの値は Astryx だけが持つ。** 色・余白・角丸・文字の値は `src/themes/onnenai/onnenaiTheme.ts`（defineTheme。変更後は `pnpm theme:build`）に置き、Astryx にないもの（`--color-calendar-*` `--calendar-*` など）は同じテーマの `localTokens` に入れる。`:root` で上書きしない。Tailwind 側で値を定義しない
2. **レイアウトは Astryx のレイアウト部品（VStack / HStack / Grid / GridSpan など）で組む。** スタイルを書く手段は `className` だけで、使ってよいクラスは `docs/TOKENS.md` の一覧にあるものだけ。Tailwind の任意値（`p-[13px]`）、既定パレット（`bg-blue-500`）、インライン style、16進カラー、`xstyle` / StyleX は禁止。必要なトークンがなければ作らずに止めて、「Figma にどのバリアブルを足せばよいか」をユーザーに聞く
3. **週グリッドは位置を計算しない。** 30分 = 1マスとして `Grid rowHeight` + `GridSpan rows={n}` で空き／埋まりを積む（DESIGN.md §6.3）。現在時刻の線も 30 分単位で同じ方法で置く（§6.4）
4. **部品は Astryx を優先する。** props は `pnpm exec astryx component <Name>` で確認してから書く（週切替 = SegmentedControl、読み込み中 = Skeleton、失敗 = EmptyState）。Astryx で組めないものだけ自作し、作る前に理由を伝える
5. **#66ccff（`--color-accent`）と `--color-calendar-busy` を文字色や細い線に使わない。** 塗り専用
6. **Figma が正。** UI を作る前に Figma MCP（`get_design_context` / `get_variable_defs` / `get_screenshot`）で該当フレームを読む。Figma にない装飾やアニメーションを足さない
7. **文章を書かない。** 見出し・説明文などの文言は Figma から `src/content/site.ts` に写す。Figma にない文言が必要なら `TODO(owner): 〇〇を書く` を置いて聞く
8. **意味を持つ HTML 要素は使う**（`header` `nav` `main` `section` `footer` `ul` `li` `a` `time`）。予定ブロックに出す文字は「予定あり」だけ（上端左寄せ・白 = `text-on-dark`、2026-11-26 ユーザー指示）。予定の中身は出さず、日付と時刻は `aria-label` で伝える
9. CSS の読み込みは `src/styles/globals.css` の 1 か所だけ（`src/main.tsx` の 1 行目）。レイヤー順を崩さない
10. ダークモードは Astryx の `<Theme>` に任せる。別の仕組みを足さない
11. モジュールのトップレベルで `window` `document` `localStorage` に触らない。データは loader で用意する

## Astryx まわりの注意

- Astryx のパッケージはバージョン固定（onnenai-portfolio と同じ 0.7.11）で、全部同じリリースにそろえる。勝手に上げない
- 部品は個別エントリから import する（`@astryxdesign/core/Button`）
- Astryx CLI が生成するエージェント向けドキュメントは `docs/astryx-agent.md` に置く（init のたびに上書きされるので編集しない）

## Figma に指示がない限りやらないこと

- 全大文字のラベル、見出しの上の小さな飾りラベル
- 見出しの一語だけ色や太さを変える
- カードに影やグラデーション（カードは境界線だけ）
- リンク文字末尾の `→`、フェードイン・スライドアップ、ホバーアニメーション

## 確認を取ること

- `wrangler deploy`、`wrangler secret put`、KV namespace の作成、DNS / カスタムドメインの変更は、実行前に必ずユーザーに確認する
- Google Cloud Console / OAuth の操作はユーザーが行う。手順を README に書いて案内する
- 依存の追加は理由を添えて伝える

## コマンド

- `pnpm dev` 開発サーバー（`@cloudflare/vite-plugin` で画面と Worker を同時に起動。`.dev.vars` の `MOCK=1` でモックデータ）
- `pnpm test` vitest（`test/**/*.test.ts`）
- `pnpm check` 型チェック（`tsc -b`: 画面 / Worker / Node の3つの tsconfig）+ lint + `scripts/token-guard.sh` + `astryx doctor`
- `pnpm build` ビルド（`dist/client` と Worker）
- `pnpm theme:build` テーマを変えたら実行
- `pnpm cf-typegen` `wrangler.jsonc` を変えたら実行（`worker-configuration.d.ts` を再生成）
- `pnpm deploy` ビルド → デプロイ（実行前にユーザーに確認）

変更のたびに `pnpm check`・`pnpm test`・`pnpm build` を通してから報告する。
