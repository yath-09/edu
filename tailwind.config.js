/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0F172A',
        primary: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
        },
        secondary: {
          DEFAULT: '#64748B',
          hover: '#475569',
        },
        success: '#22C55E',
        error: '#EF4444',
        card: '#1E293B',
      },
    },
  },
  plugins: [],
}