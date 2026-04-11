/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // Generate all color variations for dynamic theming
    {
      pattern: /(bg|text|border|from|to|hover:bg|hover:text|hover:border|hover:from|hover:to)-(blue|purple|green|red|indigo|pink|cyan|teal|orange|amber|lime|emerald|sky|violet|fuchsia|rose)-(50|100|200|300|400|500|600|700|800|900)/,
      variants: ['hover', 'focus', 'active'],
    },
  ],
}