export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bar-dark': '#1a1a2e',
        'bar-card': '#16213e',
        'bar-accent': '#e94560',
        'bar-blue': '#0f3460',
        // Slightly elevated surface for nested cards / hover states
        'bar-surface': '#1d2b50',
      },
      spacing: {
        // Touch + notch / home-bar safe areas
        'touch': '2.75rem', // 44px minimum tap target
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      minHeight: {
        'touch': '2.75rem',
      },
      minWidth: {
        'touch': '2.75rem',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s ease infinite',
      },
    },
  },
  plugins: [],
}
