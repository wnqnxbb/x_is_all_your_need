/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        body: ['Open Sans', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#2563EB',  // blue-600
          light: '#3B82F6',    // blue-500
        },
        cta: '#F97316',          // orange-500
        background: '#F8FAFC',    // slate-50
        text: {
          DEFAULT: '#1E293B',    // slate-800
          muted: '#64748B',       // slate-500
        },
        border: '#E2E8F0',       // slate-200
      },
    },
  },
  plugins: [],
}
