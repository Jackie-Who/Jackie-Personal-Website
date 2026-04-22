/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Creative palette — deep purple-black, muted pink/mauve
        creative: {
          bg: '#0e0a12',
          surface: '#1e1424',
          border: '#2a1830',
          accent: '#c8a0b8',
          text: '#c8a0b8',
          'text-secondary': '#9a7898',
          'text-muted': '#5a4060',
          'text-faint': '#3a2848',
          signature: '#d4a0cc',
          logo: '#9a5a90',
          brain: '#c77dba',
        },
        // Tech palette — dark blue-black, blue accents
        tech: {
          bg: '#080c16',
          surface: '#0c1520',
          border: '#1a2a3a',
          accent: '#5a9fd4',
          text: '#c0d8f0',
          'text-secondary': '#8ab8e0',
          'text-muted': '#4a6880',
          'text-faint': '#3a5878',
          signature: '#7ab0d8',
          logo: '#3a7abd',
          brain: '#5a9fd4',
        },
        // Neutral palette — hero page default
        neutral: {
          bg: '#fafafa',
          surface: '#ffffff',
          border: '#e0e0e0',
          accent: '#1a1a1a',
          text: '#1a1a1a',
          'text-secondary': '#666666',
          'text-muted': '#999999',
          'text-faint': '#cccccc',
        },
      },
      fontFamily: {
        // Creative — serif italic
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        // Tech — monospace
        mono: ['"JetBrains Mono"', '"Fira Code"', '"Courier New"', 'monospace'],
        // Hero neutral
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Tight scale for the interface
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },
      spacing: {
        // 8-point grid
        '18': '4.5rem',
      },
      borderRadius: {
        pill: '0.625rem',
        btn: '0.875rem',
      },
      transitionTimingFunction: {
        'panel-slide': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        '550': '550ms',
        '400': '400ms',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        scanline: {
          '0%': { top: '-2px' },
          '100%': { top: '100%' },
        },
        bob: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(3px)' },
        },
        vbar: {
          '0%': { height: '4px' },
          '100%': { height: 'var(--h, 20px)' },
        },
      },
      animation: {
        blink: 'blink 1s step-end infinite',
        scanline: 'scanline 2s linear infinite',
        bob: 'bob 1.5s ease-in-out infinite',
        vbar: 'vbar 0.8s ease-in-out infinite alternate',
      },
    },
  },
  plugins: [],
};
