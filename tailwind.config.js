/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta suave basada en el logo de Agrofem
        brand: {
          primary: "#E1251B",       // rojo principal
          primaryDark: "#B51B14",   // rojo más oscuro (hover, énfasis)
          soft: "#FFE5E0",          // fondo rojito muy suave
          accentSoft: "#FFEFC2",    // amarillito suave para bordes/fondos
          surface: "#FFF9F3",       // fondo general cálido
          dark: "#3B1C10",          // texto oscuro tipo marrón
        },
      },
    },
  },
  plugins: [],
};
