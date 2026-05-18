import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Space Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body:    ['Space Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'ui-monospace', 'SF Mono', 'Consolas', 'monospace'],
        sans:    ['Space Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        /* TradeOS semantic */
        long:  '#089981',
        short: '#F23645',
        brand: '#2962FF',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',   /* 10px — cards, panels, buttons */
        md: '0.5rem',          /* 8px — smaller elements */
        sm: '0.375rem',        /* 6px — tooltips, tags */
        xl: '0.75rem',         /* 12px — modals */
        '2xl': '1rem',         /* 16px — bottom sheets */
        full: '9999px',        /* pill */
      },
      fontSize: {
        'xxs': ['11px', { lineHeight: '1.35' }],
        'xs':  ['12px', { lineHeight: '1.35' }],
        'sm':  ['13px', { lineHeight: '1.45' }],
        'base':['14px', { lineHeight: '1.55' }],
        'md':  ['16px', { lineHeight: '1.5'  }],
        'lg':  ['20px', { lineHeight: '1.35' }],
        'xl':  ['24px', { lineHeight: '1.15' }],
        '2xl': ['32px', { lineHeight: '1.1'  }],
        '3xl': ['48px', { lineHeight: '1.05' }],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out'
      }
    }
  },
  plugins: [],
};
export default config;
