import boundaries from "eslint-plugin-boundaries";

// Aturan dependensi satu arah dari ADR-0002:
// app → features → ui, api, i18n → core
const element = (type) => ({ element: { type } });
const anyOf = (...types) => ({ element: { types: { anyOf: types } } });

const MOCK_IMPORTS = ["@rusuh/mocks", "@rusuh/mocks/*"];
const FRAMEWORK_IMPORTS = ["react", "react-dom", "react/*", "next", "next/*"];

const FEATURE_PATTERNS = [{ group: MOCK_IMPORTS, message: "Mock hanya dimuat dari AppProviders, instrumentation, dan test (ADR-0002)." }];
const FEATURE_PATHS = [
  {
    name: "@rusuh/api",
    importNames: ["startPayment", "startSession"],
    message: "Panggil lewat `application` di features/shared/composition.ts (ADR-0015).",
  },
];

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
    // core: lapisan domain tidak boleh bergantung ke application (use case). Arah: application → domain (ADR-0015).
    files: [
      "packages/core/src/{domain,errors,booking,queue,time,payment,auth}/**/*.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          // `patterns` harus seragam (string semua atau objek semua), jadi semuanya ditulis sebagai objek.
          patterns: [
            { group: [...FRAMEWORK_IMPORTS, "@tanstack/*", ...MOCK_IMPORTS], message: "core tidak boleh bergantung pada framework, data fetching, atau mock (ADR-0002)." },
            { group: ["**/application", "**/application/**"], message: "Domain tidak boleh mengimpor use case (ADR-0015)." },
          ],
        },
      ],
    },
  },
  {
    // features: command dengan aturan bisnis dipanggil lewat `application` (composition.ts), bukan adapter api langsung.
    // Query (baca) tetap lewat query options. emulatePaymentOutcome hanya ada di mock dan sengaja dilewatkan.
    files: ["apps/web/features/**/*.{ts,tsx}"],
    ignores: ["apps/web/features/shared/composition.ts"],
    rules: { "no-restricted-imports": ["error", { patterns: FEATURE_PATTERNS, paths: FEATURE_PATHS }] },
  },
  {
    // ViewModel mengembalikan state layar, bukan teks: i18n hanya di mapper to<Screen>ViewProps (ADR-0017).
    // Opsi ditulis ulang lengkap karena flat config menimpa opsi rule yang sama, bukan menggabungkannya.
    files: ["apps/web/features/**/use*ViewModel.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: FEATURE_PATTERNS,
          paths: [...FEATURE_PATHS, { name: "@rusuh/i18n", message: "Teks dibentuk di to<Screen>ViewProps, bukan di ViewModel (ADR-0017)." }],
        },
      ],
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
