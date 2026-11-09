import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "./eslint.boundaries.mjs";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  ...boundaries,
  {
    // Kebersihan kode (.kiro/steering/coding-conventions.md)
    files: ["**/*.{ts,tsx,mjs}"],
    rules: {
      "no-nested-ternary": "error",
      "no-duplicate-imports": ["error", { allowSeparateTypeImports: true }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-expect-error": "allow-with-description", "ts-ignore": true, minimumDescriptionLength: 10 },
      ],
      "jsx-a11y/click-events-have-key-events": "error",
      "jsx-a11y/no-static-element-interactions": "error",
      "jsx-a11y/label-has-associated-control": [
        "error",
        { controlComponents: ["RadioGroupItem", "Checkbox"], assert: "either" },
      ],
      "jsx-a11y/anchor-is-valid": "error",
    },
  },
  {
    // Standarisasi primitif UI ke Base UI (shadcn style base-mira); Radix tidak dipakai.
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["radix-ui", "@radix-ui/*"],
              message: "Pakai komponen Base UI di src/components/ui (@base-ui/react).",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name='select']",
          message:
            "Pakai komponen Select dari src/components/ui/select.tsx (Base UI), bukan <select> native.",
        },
      ],
    },
  },
  {
    // Logger direncanakan sebagai protocol di core/domain; test dan skrip boleh mencetak.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}"],
    rules: { "no-console": "error" },
  },
  globalIgnores([
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "coverage/**",
    "**/next-env.d.ts",
    "src/core/data/http/generated/**",
    "public/mockServiceWorker.js",
  ]),
]);
