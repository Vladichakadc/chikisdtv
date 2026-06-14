/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#f97316',   // orange-500
          dark:    '#c2410c',   // orange-700
          light:   '#fed7aa',   // orange-200
          accent:  '#1e293b'    // slate-800
        },
        ui: {
          background: '#f8fafc',
          surface:    '#ffffff',
          border:     '#e2e8f0'
        },
        state: {
          success: '#22c55e',
          warning: '#f59e0b',
          error:   '#ef4444',
          info:    '#3b82f6'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06)'
      }
    }
  },
  plugins: []
}
