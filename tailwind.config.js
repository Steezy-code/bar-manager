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
        // Lighter accent for text-only links on dark backgrounds — base bar-accent
        // fails WCAG AA (4.5:1) as body text; keep bar-accent for filled buttons/badges
        // where the fill itself provides contrast.
        'bar-accent-light': '#fda4b5',
        // Status swatch tones (icon + tinted background), so status reads via more
        // than hue alone — used alongside existing color/shape/text cues.
        'bar-danger-bg': '#3a1620',
        'bar-warning': '#f0c94a',
        'bar-warning-bg': '#2a2510',
        'bar-success': '#5fd98a',
        'bar-success-bg': '#122a1a',
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
