// サイトの文言はここだけに置く（CLAUDE.md デザインシステム 7）。出どころは Figma の Calendar / Desktop・Mobile
export const site = {
  name: 'calendar.onnenai.cc',
  // Footer の © 表記（Figma: 「© 2026 onnenai.cc」）
  copyrightName: 'onnenai.cc',
  links: [{ label: 'Misskey', href: 'https://social.onnenai.cc/@onnel' }],
  newTabLabel: '（新しいタブで開く）',
  // ルートにない URL（SPA なので画面側で出す）。文言は onnenai-portfolio と同じ
  notFound: {
    title: '404 Not Found',
    body: 'お探しのページが見つかりません',
    backLabel: 'トップへ',
  },
} as const

export const calendarText = {
  title: 'おんねのカレンダー',
  description: '予定の詳細は公開していません。',
  weeks: { 0: '今週', 1: '来週' },
  // 週切替（SegmentedControl）の読み上げ用ラベル。画面には出ない（2026-11-26 ユーザー確認）
  weekSwitchLabel: '表示する週',
  weekdays: ['月', '火', '水', '木', '金', '土', '日'],
  updatedPrefix: '最終更新',
  early: '▲ 8時前あり',
  today: '今日',
  noBusy: '予定なし',
  // 予定ブロックの aria-label の頭（DESIGN.md §6.3「予定あり 09:00–10:30」）
  busyLabel: '予定あり',
  // 取得失敗（DESIGN.md §6.6。Figma にはまだ無い）
  error: '情報を取得できませんでした',
} as const

// 本文中のリンク。文字列とリンクを並べて1段落にする
export type Inline = string | { label: string; href: string }

// プライバシーポリシー（/privacy）。Google Auth Platform で本番公開するのに URL が必須なため置く
// 文面は 2026-11-26 にユーザーから任された下書き。実装（DESIGN.md）と食い違ったら直す
export const privacyText = {
  title: 'プライバシーポリシー',
  description: 'このサイトでの Google ユーザーデータの扱いについて',
  sections: [
    {
      heading: '取得する情報',
      paragraphs: [
        [
          'このサイトは Google Calendar API の FreeBusy（空き時間情報）だけを使い、運営者本人のカレンダーで予定が入っている時間帯（開始と終了の時刻）を取得します。予定のタイトル・場所・参加者・説明などは取得しません。',
        ],
      ],
    },
    {
      heading: '使い方',
      paragraphs: [
        [
          '取得した時間帯は30分単位にまとめ、このサイトで「埋まっている時間帯」として表示するためだけに使います。どのカレンダーの予定かは区別せずに表示します。',
        ],
      ],
    },
    {
      heading: '保存と共有',
      paragraphs: [
        [
          '取得したデータ（今日から15日分の時間帯）は Cloudflare 上に保存し、15分ごとに新しいものへ置き換えます。第三者への提供・販売や、広告への利用はしません。',
        ],
      ],
    },
    {
      heading: '閲覧する方の情報',
      paragraphs: [
        [
          'このサイトは閲覧する方に Google アカウントでのログインを求めず、閲覧する方のカレンダーやその他の Google のデータにアクセスしません。サーバーの動作を確認するため、Cloudflare の機能でアクセスの記録（日時・URL など）が残ることがあります。',
        ],
      ],
    },
    {
      heading: 'Google API サービスのユーザーデータに関するポリシー',
      paragraphs: [
        [
          'Google API から受け取った情報の使用と他のアプリへの転送は、限定使用の要件を含む',
          {
            label: 'Google API サービスのユーザーデータに関するポリシー',
            href: 'https://developers.google.com/terms/api-services-user-data-policy',
          },
          'に従います。',
        ],
      ],
    },
    {
      heading: 'お問い合わせ',
      paragraphs: [
        [
          'このポリシーについてのお問い合わせは',
          { label: 'Misskey', href: 'https://social.onnenai.cc/@onnel' },
          'までお願いします。',
        ],
      ],
    },
  ] satisfies { heading: string; paragraphs: Inline[][] }[],
  updated: '2026年11月26日 制定',
} as const
