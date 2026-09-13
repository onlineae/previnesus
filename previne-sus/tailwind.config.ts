import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sus: {
          blue: {
            DEFAULT: "#005DAA",
            dark: "#003865",
            light: "#E1F0FA",
          },
          green: {
            DEFAULT: "#00843D",
            dark: "#005A2A",
            light: "#E3F7EB",
          },
          yellow: {
            DEFAULT: "#FFCC00",
            dark: "#B38F00",
          }
        },
        manchester: {
          red: "#DC2626",      // Vermelho - Emergência (0 min)
          orange: "#EA580C",   // Laranja - Muito Urgente (10 min)
          yellow: "#EAB308",   // Amarelo - Urgente (60 min)
          green: "#16A34A",    // Verde - Pouco Urgente (120 min)
          blue: "#2563EB",     // Azul - Não Urgente (240 min)
        }
      },
    },
  },
  plugins: [],
};
export default config;
