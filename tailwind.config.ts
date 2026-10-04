import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#F3F3F1',
        foreground: '#111111',
        muted: '#666664',
        line: 'rgba(17, 17, 17, 0.12)',
        accent: '#E24B1F',
      },
      fontFamily: {
        sans: ['Overused Grotesk', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['Fragment Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
