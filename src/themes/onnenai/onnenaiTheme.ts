// onnenai テーマ（onnenai-portfolio から切り出し）。値の正は Figma「onnenai.cc-systems（コピー）」の Foundations と変数。
// 変更したら `pnpm theme:build` で再ビルドする。
import { defineTheme } from '@astryxdesign/core/theme'
import { neutralTheme } from '@astryxdesign/theme-neutral'
import {
  CALENDAR_BLOCK_GAP,
  CALENDAR_NOW_DOT_SIZE,
  CALENDAR_NOW_LINE_WIDTH,
  CALENDAR_SLOT_HEIGHT,
  CALENDAR_TIME_COLUMN_WIDTH,
} from './calendar'

const px = (n: number) => `${n}px`

const fontFallbacks = 'system-ui, sans-serif'

// Type scale（Figma: テキストスタイル）
const typeScale = {
  '--text-display-1-size': '3.5rem',
  '--text-display-1-leading': '1.15',
  '--text-display-1-weight': 'var(--font-weight-bold)',
  '--text-display-2-size': '2.5rem',
  '--text-display-2-leading': '1.2',
  '--text-display-2-weight': 'var(--font-weight-bold)',
  '--text-heading-1-size': '2rem',
  '--text-heading-1-leading': '1.3',
  '--text-heading-1-weight': 'var(--font-weight-bold)',
  '--text-heading-2-size': '1.5rem',
  '--text-heading-2-leading': '1.4',
  '--text-heading-2-weight': 'var(--font-weight-bold)',
  '--text-heading-3-size': '1.25rem',
  '--text-heading-3-leading': '1.5',
  '--text-heading-3-weight': 'var(--font-weight-bold)',
  '--text-large-size': '1.125rem',
  '--text-large-leading': '1.7',
  '--text-large-weight': 'var(--font-weight-normal)',
  '--text-body-size': '1rem',
  '--text-body-leading': '1.8',
  '--text-body-weight': 'var(--font-weight-normal)',
  '--text-label-size': '0.875rem',
  '--text-label-leading': '1.5',
  '--text-label-weight': 'var(--font-weight-medium)',
  '--text-supporting-size': '0.8125rem',
  '--text-supporting-leading': '1.6',
  '--text-supporting-weight': 'var(--font-weight-normal)',
}

export const onnenaiTheme = defineTheme({
  name: 'onnenai',
  extends: neutralTheme,

  typography: {
    body: { family: 'Gen Interface JP', fallbacks: fontFallbacks },
    heading: { family: 'Gen Interface JP', fallbacks: fontFallbacks },
    code: {
      family: 'ui-monospace',
      fallbacks:
        '"SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },
  },

  // neutral から継承したタッチ端末向けのタイプスケール変更を打ち消し、Figma の値に戻す
  adaptations: {
    rules: [
      {
        when: { pointer: 'coarse', width: { below: 'lg' } },
        value: { tokens: typeScale },
      },
      // Figma の Top / Mobile: ヒーローの見出しは display/1 ではなく display/2 の大きさ
      {
        when: { width: { below: 'md' } },
        value: {
          tokens: {
            '--text-display-1-size': typeScale['--text-display-2-size'],
            '--text-display-1-leading': typeScale['--text-display-2-leading'],
          },
        },
      },
    ],
  },

  // Astryx にないアプリ独自トークン。名前を Astryx と重ねない
  // ドット背景（--color-decor-dot など）は Figma の Calendar 画面に無いので持ってきていない
  localTokens: {
    '--layout-content-width': '1120px',
    '--layout-gutter': '24px',
    '--space-block': '64px', // Figma spacing/16
    '--space-section': '96px', // Figma spacing/24

    // カレンダー（DESIGN.md §6.2）
    '--color-calendar-busy': ['#66ccff', '#1ab2ff'], // tianyi/400 / tianyi/500。塗り専用
    '--color-calendar-now': ['#e5484d', '#ff6b70'], // red/500 / red/400
    '--calendar-slot-height': px(CALENDAR_SLOT_HEIGHT),
    '--calendar-time-column-width': px(CALENDAR_TIME_COLUMN_WIDTH),
    '--calendar-now-line-width': px(CALENDAR_NOW_LINE_WIDTH),
    '--calendar-now-dot-size': px(CALENDAR_NOW_DOT_SIZE),
    '--calendar-block-gap': px(CALENDAR_BLOCK_GAP),
  },

  tokens: {
    // Color（Figma: Color modes / [Light, Dark]）
    '--color-background-body': ['#f5f8fa', '#070d12'],
    '--color-background-surface': ['#ffffff', '#0e1820'],
    '--color-background-card': ['#ffffff', '#0e1820'],
    '--color-background-muted': ['#ecf1f4', '#19242e'],
    '--color-text-primary': ['#121921', '#e7eff3'],
    '--color-text-secondary': ['#5e6d79', '#98a8b3'],
    '--color-text-accent': ['#006aa3', '#66ccff'],
    '--color-accent': ['#66ccff', '#66ccff'],
    '--color-accent-muted': ['#d6f1ff', '#09283e'],
    '--color-on-accent': ['#121921', '#070d12'],
    '--color-border': ['#dae2e7', '#293642'],
    '--color-border-emphasized': ['#c4cfd4', '#3d4e5c'],
    '--focus-outline-color': ['#0088cc', '#66ccff'],

    // Radius（Figma: radius/*）
    '--radius-inner': '0.5rem',
    '--radius-element': '0.75rem',
    '--radius-container': '1rem',
    '--radius-page': '2rem',

    ...typeScale,
  },
  // 部品の見た目（Figma: Components）
  components: {
    link: {
      // 押したときのグレーの地（Astryx の pressed オーバーレイ）を出さない（ユーザー指示）
      base: { '--color-overlay-pressed': 'transparent' },
    },
    button: {
      // Figma の Button Style=Secondary は塗りなし＋border-emphasized の線
      'variant:secondary': {
        backgroundColor: 'transparent',
        border: '1px solid var(--color-border-emphasized)',
      },
    },
  },
})
