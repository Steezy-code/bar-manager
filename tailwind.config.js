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
        toastIn: {
          'from': { opacity: '0', transform: 'translateX(110%)' },
          'to':   { opacity: '1', transform: 'translateX(0)' },
        },
        quantityPop: {
          '0%':   { transform: 'scale(1)' },
          '40%':  { transform: 'scale(1.45)', color: '#e94560' },
          '70%':  { transform: 'scale(0.92)' },
          '100%': { transform: 'scale(1)' },
        },
        checkPop: {
          '0%':   { transform: 'scale(0)',    opacity: '0' },
          '60%':  { transform: 'scale(1.35)', opacity: '1' },
          '80%':  { transform: 'scale(0.88)' },
          '100%': { transform: 'scale(1)',    opacity: '1' },
        },
      },
      animation: {
        shimmer:       'shimmer 1.4s ease infinite',
        'toast-in':    'toastIn 0.25s ease-out',
        'quantity-pop':'quantityPop 0.35s ease-out',
        'check-pop':   'checkPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'fade-slide-up': 'fadeSlideUp 0.4s ease-out both',
      },
    },
  },
  plugins: [],
}
