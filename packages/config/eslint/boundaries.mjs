import boundaries from "eslint-plugin-boundaries";

// Aturan dependensi satu arah dari ADR-0002:
// app → features → ui, api, i18n → core
const element = (type) => ({ element: { type } });
const anyOf = (...types) => ({ element: { types: { anyOf: types } } });

const MOCK_IMPORTS = ["@rusuh/mocks", "@rusuh/mocks/*"];
const FRAMEWORK_IMPORTS = ["react", "react-dom", "react/*", "next", "next/*"];

const boundariesConfig = [
  {
    files: ["packages/*/src/**/*.{ts,tsx}", "apps/web/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        { type: "core", pattern: "packages/core/**" },
        { type: "api", pattern: "packages/api/**" },
        { type: "ui", pattern: "packages/ui/**" },
        { type: "i18n", pattern: "packages/i18n/**" },
        { type: "features", pattern: "apps/web/features/**" },
        { type: "app", pattern: "apps/web/app/**" },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        2,
        {
          default: "allow",
          policies: [
            { from: element("core"), disallow: { to: anyOf("api", "ui", "i18n", "features", "app") } },
            { from: element("api"), disallow: { to: anyOf("ui", "i18n", "features", "app") } },
            { from: element("ui"), disallow: { to: anyOf("api", "features", "app") } },
            // ui boleh mengimpor tipe dari core (ADR-0002), tetapi bukan nilai.
            { from: element("ui"), dependency: { kind: "value" }, disallow: { to: element("core") } },
            { from: element("i18n"), disallow: { to: anyOf("api", "ui", "features", "app") } },
            { from: element("features"), disallow: { to: element("app") } },
            { from: element("app"), disallow: { to: anyOf("core", "api", "i18n") } },
          ],
        },
      ],
    },
  },
  {
    // Mock hanya boleh dimuat dari titik masuk yang menjaganya dengan NEXT_PUBLIC_API_MOCKING, dan dari test.
    files: ["packages/*/src/**/*.{ts,tsx}", "apps/web/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { patterns: MOCK_IMPORTS }] },
  },
  {
    // ui: hanya token desain, tidak ada nilai warna mentah (konvensi: token Signal, bukan hex)
    files: ["packages/ui/src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/#[0-9a-fA-F]{3,8}$/]",
          message: "Pakai token desain (bg-primary, text-muted, currentColor), bukan nilai hex.",
        },
      ],
    },
  },
  {
    // core: TypeScript murni, tanpa framework dan I/O
    files: ["packages/core/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [...FRAMEWORK_IMPORTS, "@tanstack/*", ...MOCK_IMPORTS] },
      ],
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "core tidak boleh melakukan I/O (ADR-0002)." },
        { name: "window", message: "core tidak boleh menyentuh browser (ADR-0002)." },
        { name: "document", message: "core tidak boleh menyentuh browser (ADR-0002)." },
      ],
      "no-restricted-properties": [
        "error",
        { object: "Date", property: "now", message: "Terima `now` sebagai parameter (ADR-0005)." },
      ],
    },
  },
  {
    // api: satu-satunya yang melakukan HTTP, tanpa React
    files: ["packages/api/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [...FRAMEWORK_IMPORTS, ...MOCK_IMPORTS] }],
    },
  },
  {
    // Pengecualian: titik masuk mock dan test.
    files: [
      "apps/web/features/shared/AppProviders.tsx",
      "apps/web/instrumentation.ts",
      "**/*.test.{ts,tsx}",
      "**/__tests__/**/*.{ts,tsx}",
    ],
    rules: { "no-restricted-imports": "off" },
  },
];

export default boundariesConfig;
