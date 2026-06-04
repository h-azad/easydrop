import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#f5f3eb",
        paper: "#0b0f10",
        moss: "#54e08e",
        coral: "#ff6b59",
        sky: "#79d8ff",
        acid: "#dfff3f",
        night: "#050707"
      },
      boxShadow: {
        panel: "0 24px 90px rgba(0, 0, 0, 0.45)"
      }
    }
  },
  plugins: []
};

export default config;
