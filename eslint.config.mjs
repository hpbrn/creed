import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    "**/.next*/**", "**/node_modules/**", "**/next-env.d.ts", "**/build/**",
    "**/out/**", "disposable/**", "**/dist/**", "**/target/**", "**/gen/**",
  ]),
  { settings: { next: { rootDir: "apps/home/" } }, rules: {
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
    "react-hooks/refs": "off", "react-hooks/set-state-in-effect": "off"
  } },
  { files: ["apps/desktop/**/*.{ts,tsx}"], rules: { "@next/next/no-img-element": "off", "@next/next/no-html-link-for-pages": "off" } }
]);
