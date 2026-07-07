import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Pretendard", "-apple-system", "system-ui", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
