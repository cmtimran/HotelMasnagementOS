/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#fafafc',
        foreground: '#18181d',
        card: {
          DEFAULT: '#ffffff',
          foreground: '#18181d',
        },
        primary: {
          DEFAULT: '#0074d9',
          hover: '#0063ba',
          active: '#00539c',
          subtle: '#f0f7ff',
          border: '#b8dcff',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#f4f4f7',
          foreground: '#252530',
        },
        muted: {
          DEFAULT: '#f4f4f7',
          foreground: '#686871',
        },
        accent: {
          DEFAULT: '#f0f7ff',
          foreground: '#00539c',
        },
        destructive: {
          DEFAULT: '#df2225',
          foreground: '#ffffff',
        },
        border: '#e4e4e7',
        input: '#e1e1e4',
        ring: '#0074d9',
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
