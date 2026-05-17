/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./App.{js,jsx,ts,tsx}",
        "./screens/**/*.{js,jsx,ts,tsx}",
        "./components/**/*.{js,jsx,ts,tsx}",
        "./configuration/**/*.{js,jsx,ts,tsx}",
        "./navigation/**/*.{js,jsx,ts,tsx}",
        "./layout/**/*.{js,jsx,ts,tsx}",
        "./hooks/**/*.{js,jsx,ts,tsx}",
        "./utils/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                'wendy': ['WendyOne'],
                'sf': ['SF-Regular'],
                'sf-bold': ['SF-Bold'],
                'sf-semi': ['SF-Semibold'],
            },
            colors: {
                primary:'#8294FF',
                extra: '#787878',
                logo:'#7A81C4'
            }
        },
    },
    plugins: [],
}