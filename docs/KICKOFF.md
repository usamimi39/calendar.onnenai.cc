# Claude Code 最初のプロンプト（コピペ用）

`~/calendar.onnenai.cc` で `claude` を起動して、以下を順に投げる。各プロンプトの最後で止まって報告を待つ。

## プロンプト1: 読み込みと計画（まだコードは書かない）

```
CLAUDE.md、docs/SPEC.md、docs/DESIGN.md を全部読んでください。
次に Figma（fileKey StaCqb5YymeoFNa003OPuA）の Calendar / Desktop（2006:22436）と Calendar / Mobile（2006:22707）、
Components ページの Calendar/* 部品を get_screenshot / get_design_context / get_variable_defs で読んでください。
その上で:
- DESIGN.md と Figma の食い違い（文言・部品・トークン）
- DESIGN.md §10 の実装ステップを、このリポジトリ用に具体化した作業計画
- 判断が必要な点（あれば）
を短く報告してください。まだコードは書かないでください。
```

## プロンプト2: 雛形の切り出し

```
DESIGN.md §2 のとおり、~/onnenai-portfolio の現状から雛形を切り出してください。
- 持ってくるもの / 持ってこないものは §2 のリストどおり。Astryx などの依存は portfolio と同じバージョンに固定
- portfolio の node_modules は使わず、このリポジトリで pnpm install する
- @cloudflare/vite-plugin と vitest を追加（理由を添えて）
- wrangler.jsonc は §2 の案で。KV の id は空欄のまま（作成は僕が確認してから）
- テーマに DESIGN.md §6.2 の calendar 用 localTokens を追加し、docs/TOKENS.md に対応するクラス名を追記
- .gitignore に .dev.vars / dist / .wrangler / node_modules、.dev.vars.example を作成（値は空）
- 空のトップページ（Header / Footer だけ）が pnpm dev で表示され、pnpm check と pnpm build が通るところまで
```

## プロンプト3: ロジックとテスト

```
DESIGN.md §3〜§5 の純粋関数（src/lib/time.ts、src/lib/busy.ts の round / merge / clip / weekWindow / toSegments）を
テストから先に書いて実装してください。§9 の境界ケースは全部テストに入れてください。
続けて src/worker/api.ts を MOCK=1 で fixtures/mock-busy.json を返す形で実装し、
week の検証（0|1 以外は 400）とレスポンスのホワイトリストもテストしてください。
fixture は Figma のたたき台と同じデータ（今日 = 水曜 14:00 想定）にしてください。実 ID は書かないこと。
```

## プロンプト4: 画面

```
Figma の Calendar / Desktop と Calendar / Mobile を正として画面を実装してください（DESIGN.md §6）。
- 週グリッドは §6.3 の「マスを積む」方式。インライン style や任意値を使わずに組めない箇所が出たら止めて相談
- 現在時刻の線は §6.4（30分単位、日付が変わったら loader を再実行）
- ローディングは Skeleton、失敗は EmptyState
- ライト / ダーク両方、PC / スマホ両方のスクリーンショットを Figma と見比べて差分を報告
```

## プロンプト5: Google 連携

```
DESIGN.md §4 と §8 をやってください。
- src/worker/google.ts（token と freeBusy の2つだけ）、refresh.ts、scheduled ハンドラ
- README に OAuth のセットアップ手順（同意画面を本番に公開する話を含む）、Secret、KV、デプロイ、ドメインの手順
- 実データの確認は、僕が .dev.vars を用意してから wrangler の scheduled テストで行います。準備ができたら声をかけます
```

## プロンプト6: 仕上げとデプロイ

```
SPEC §10 の受け入れ条件と DESIGN.md §9 の確認を全部チェックして結果を表で見せてください。
実データで終日予定・繰り返し予定・共有カレンダー（他アカウント所有）の挙動も確認してください。
問題なければ、KV の作成・secret の登録・deploy の順に、1つずつ僕に確認してから進めてください。
```
