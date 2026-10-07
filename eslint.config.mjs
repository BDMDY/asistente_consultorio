import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [...coreWebVitals, ...typescript, { ignores: ["*.config.js", "tailwind.preset.cjs", "design/**", ".next/**", "node_modules/**", "next-env.d.ts"] }];

export default config;
