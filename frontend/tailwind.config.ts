import type { Config } from 'tailwindcss';

// Token values live in app/globals.css as CSS custom properties (05 §3);
// this file only exposes them to Tailwind. next-themes drives data-theme (02 §8).
const config: Config = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Neutrals + accent use RGB channels so Tailwind alpha modifiers work
        // (border-border/80, bg-accent/10). Status colors stay bare — they carry
        // pre-composited alpha in dark theme and take no opacity modifiers.
        canvas: 'rgb(var(--color-bg-canvas-rgb) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--color-bg-surface-rgb) / <alpha-value>)',
          raised: 'rgb(var(--color-bg-surface-raised-rgb) / <alpha-value>)',
          inset: 'rgb(var(--color-bg-inset-rgb) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--color-border-default-rgb) / <alpha-value>)',
          subtle: 'rgb(var(--color-border-subtle-rgb) / <alpha-value>)',
          strong: 'rgb(var(--color-border-strong-rgb) / <alpha-value>)',
        },
        content: {
          primary: 'rgb(var(--color-text-primary-rgb) / <alpha-value>)',
          secondary: 'rgb(var(--color-text-secondary-rgb) / <alpha-value>)',
          muted: 'rgb(var(--color-text-muted-rgb) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent-primary-rgb) / <alpha-value>)',
          emphasis: 'rgb(var(--color-accent-emphasis-rgb) / <alpha-value>)',
        },
        focus: 'rgb(var(--color-focus-rgb) / <alpha-value>)',
        critical: { text: 'var(--color-critical-text)', bg: 'var(--color-critical-bg)' },
        high: { text: 'var(--color-high-text)', bg: 'var(--color-high-bg)' },
        medium: { text: 'var(--color-medium-text)', bg: 'var(--color-medium-bg)' },
        low: { text: 'var(--color-low-text)', bg: 'var(--color-low-bg)' },
        info: { text: 'var(--color-info-text)', bg: 'var(--color-info-bg)' },
        success: { text: 'var(--color-success-text)', bg: 'var(--color-success-bg)' },
      },
      fontFamily: {
        display: ['var(--font-dm-sans)', 'sans-serif'],
        sans: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      // Type scale — 05 §1.1. Line-heights are fixed per token, never computed.
      fontSize: {
        'display-xl': ['56px', { lineHeight: '64px', fontWeight: '700' }],
        'display-lg': ['40px', { lineHeight: '48px', fontWeight: '700' }],
        h1: ['32px', { lineHeight: '40px', fontWeight: '700' }],
        h2: ['24px', { lineHeight: '32px', fontWeight: '600' }],
        h3: ['20px', { lineHeight: '28px', fontWeight: '600' }],
        h4: ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px' }],
        'body-md': ['14px', { lineHeight: '20px' }],
        'body-sm': ['13px', { lineHeight: '18px' }],
        label: ['13px', { lineHeight: '16px', fontWeight: '500' }],
        caption: ['12px', { lineHeight: '16px' }],
        'mono-data': ['13px', { lineHeight: '20px' }],
        'mono-block': ['13px', { lineHeight: '22px' }],
        button: ['14px', { lineHeight: '20px', fontWeight: '600' }],
      },
      spacing: {
        'page-margin': '32px',
        'card-padding': '16px',
        'section-gap': '24px',
        // Half-step and large rhythm values used across the marketing surfaces.
        '4.5': '1.125rem', // 18px
        '8.5': '2.125rem', // 34px
        '13': '3.25rem', // 52px
        '18': '4.5rem', // 72px
        '22': '5.5rem', // 88px
        '26': '6.5rem', // 104px
        '30': '7.5rem', // 120px
      },
      maxWidth: {
        marketing: '1200px',
        app: '1440px',
        measure: '68ch',
        'measure-centered': '56ch',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
      },
      boxShadow: {
        '2xs': '0 1px 2px rgb(18 21 31 / 0.04)',
        xs: '0 1px 3px rgb(18 21 31 / 0.06)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      borderWidth: {
        thick: '2px',
      },
      transitionDuration: {
        fast: '120ms',
        base: '200ms',
        slow: '320ms',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(.2,0,0,1)',
      },
      zIndex: {
        dropdown: '20',
        sticky: '30',
        drawer: '40',
        modal: '50',
        toast: '60',
      },
      height: {
        'control-sm': '32px',
        'control-md': '40px',
        'control-lg': '48px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
