/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ADD THESE NEW FONT FAMILIES
      fontFamily: {
        'playfair': ['Playfair Display', 'serif'],
        'inter': ['Inter', 'sans-serif'],
      },
      // ADD ENHANCED BACKDROP BLUR
      backdropBlur: {
        '3xl': '64px',
      },
      // ADD CUSTOM ANIMATIONS
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          'from': { opacity: '0.3' },
          'to': { opacity: '1' },
        }
      }
    },
  },
  plugins: [],
};
