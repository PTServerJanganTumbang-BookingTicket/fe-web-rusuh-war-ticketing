import boundaries from "eslint-plugin-boundaries";

// Aturan dependensi Clean Architecture per modul (ADR-0014) dan DI (ADR-0015).
//
//   app ─► di ─► modules/*/<m>.module.ts ─► infrastructure ─► application ─► domain
//    │                                                        ▲
//    └──► presentation ─(import type)────────────────────────┘
//
// Modul tidak saling mengimpor. Yang dipakai bersama ada di `src/core` (kernel murni), `src/platform`
// (adapter bersama), dan `src/ui` (presentation bersama, termasuk design system).

const SAME_MODULE = { module: "{{ from.element.captured.module }}" };

const el = (type, captured) => ({ element: captured ? { type, captured } : { type } });
const anyOf = (...types) => ({ element: { types: { anyOf: types } } });
const allow = (from, ...to) => ({ from, allow: { to } });
const allowTypes = (from, ...to) => ({ from, dependency: { kind: "type" }, allow: { to } });

const MOCK_IMPORTS = ["@/mocks", "@/mocks/*"];
const FRAMEWORK_IMPORTS = ["react", "react-dom", "react/*", "next", "next/*", "@tanstack/*"];
const DI_LIBRARY = ["awilix"];

const SRC = "src/**/*.{ts,tsx}";

const boundariesConfig = [
  {
    files: [SRC],
    plugins: { boundaries },
    settings: {
      "import/resolver": { typescript: { project: "./tsconfig.json" } },
      "boundaries/include": ["src/**/*"],
      "boundaries/elements": [
        // Kernel murni, adapter bersama, dan presentation bersama
        { type: "core-domain", pattern: "src/core/domain/**" },
        { type: "core-application", pattern: "src/core/application/**" },
        { type: "platform", pattern: "src/platform/**" },
        { type: "design-system", pattern: "src/ui/design-system/**" },
        { type: "ui", pattern: "src/ui/**" },
        // Modul fitur. `module` ditangkap supaya aturan bisa membatasi ke modul yang sama.
        { type: "domain", pattern: "src/modules/*/domain/**", capture: ["module"] },
        { type: "application", pattern: "src/modules/*/application/**", capture: ["module"] },
        { type: "infrastructure", pattern: "src/modules/*/infrastructure/**", capture: ["module"] },
        { type: "view", pattern: "src/modules/*/presentation/views/**", capture: ["module"] },
        { type: "presentation", pattern: "src/modules/*/presentation/**", capture: ["module"] },
        // Lapisan terluar
        { type: "di", pattern: "src/di/**" },
        { type: "app", pattern: "src/app/**" },
        { type: "mocks", pattern: "src/mocks/**" },
        { type: "test-support", pattern: "src/test/**" },
        // Fallback (dicocokkan terakhir): file di akar modul adalah registrasi modul (`<m>.module.ts`),
        // file di akar `src` (`proxy.ts`, `instrumentation.ts`) adalah lapisan framework.
        { type: "module-root", pattern: "src/modules/*", capture: ["module"] },
        { type: "app", pattern: "src" },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        2,
        {
          default: "disallow",
          policies: [
            // core = domain + application bersama; platform = infrastructure bersama; ui = presentation bersama.
            allow(el("core-domain"), el("core-domain")),
            allow(el("core-application"), anyOf("core-domain", "core-application")),
            allow(el("platform"), anyOf("core-domain", "core-application", "platform")),
            allow(el("design-system"), el("design-system")),
            allow(el("ui"), anyOf("core-domain", "ui", "design-system")),
            allowTypes(el("ui"), el("core-application")),

            // Domain: hanya domain modul sendiri dan core domain.
            allow(el("domain"), el("core-domain"), el("domain", SAME_MODULE)),
            // Application: use case dan port. Bergantung ke dalam saja.
            allow(
              el("application"),
              anyOf("core-domain", "core-application"),
              el("domain", SAME_MODULE),
              el("application", SAME_MODULE),
            ),
            // Infrastructure: implementasi port.
            allow(
              el("infrastructure"),
              anyOf("core-domain", "core-application", "platform"),
              el("domain", SAME_MODULE),
              el("application", SAME_MODULE),
              el("infrastructure", SAME_MODULE),
            ),
            // View: props-only. Hanya design system dan view modul sendiri; domain hanya tipe.
            allow(el("view"), el("design-system"), el("view", SAME_MODULE)),
            allowTypes(el("view"), el("domain", SAME_MODULE)),
            // Presentation: ViewModel, mapper, Container. Use case datang dari container,
            // jadi `application` hanya boleh diimpor sebagai tipe (DIP).
            allow(
              el("presentation"),
              anyOf("core-domain", "ui", "design-system"),
              el("domain", SAME_MODULE),
              el("presentation", SAME_MODULE),
              el("view", SAME_MODULE),
            ),
            allowTypes(el("presentation"), el("core-application"), el("application", SAME_MODULE)),
            // Registrasi modul: memasangkan implementasi ke port milik modul itu sendiri.
            allow(
              el("module-root"),
              anyOf("core-domain", "core-application", "platform"),
              el("domain", SAME_MODULE),
              el("application", SAME_MODULE),
              el("infrastructure", SAME_MODULE),
            ),
            // Composition root.
            allow(
              el("di"),
              anyOf("di", "module-root", "core-domain", "core-application", "platform", "ui", "mocks"),
            ),
            // Framework (Next.js): routing, layout, route handler, proxy.
            allow(
              el("app"),
              anyOf("app", "di", "presentation", "view", "ui", "design-system", "platform", "mocks"),
            ),
            allow(el("mocks"), el("mocks")),
            allow(
              el("test-support"),
              anyOf("di", "mocks", "core-application", "core-domain", "platform", "ui"),
            ),
          ],
        },
      ],
    },
  },
  {
    // Test boleh merakit apa saja (fake, container uji, MSW); aturan lapisan berlaku untuk kode produksi.
    files: ["src/**/*.test.{ts,tsx}", "src/**/__tests__/**/*.{ts,tsx}"],
    rules: { "boundaries/dependencies": "off" },
  },
  {
    // Mock hanya boleh dimuat dari titik masuk yang menjaganya dengan NEXT_PUBLIC_API_MOCKING, dan dari test.
    files: [SRC],
    rules: { "no-restricted-imports": ["error", { patterns: MOCK_IMPORTS }] },
  },
  {
    // design system dan view: hanya token desain, tidak ada nilai warna mentah (token Signal, bukan hex)
    files: ["src/ui/design-system/**/*.{ts,tsx}", "src/modules/*/presentation/views/**/*.tsx"],
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
    // domain: TypeScript murni, tanpa framework, I/O, maupun jam sistem.
    files: ["src/core/domain/**/*.ts", "src/modules/*/domain/**/*.ts"],
    ignores: ["**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [...FRAMEWORK_IMPORTS, ...DI_LIBRARY, "zod", ...MOCK_IMPORTS] },
      ],
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "domain tidak boleh melakukan I/O (ADR-0014)." },
        { name: "window", message: "domain tidak boleh menyentuh browser (ADR-0014)." },
        { name: "document", message: "domain tidak boleh menyentuh browser (ADR-0014)." },
      ],
      "no-restricted-properties": [
        "error",
        { object: "Date", property: "now", message: "Terima `now` sebagai parameter (ADR-0005)." },
      ],
    },
  },
  {
    // application: use case dan port. Tanpa framework, HTTP, atau library DI (constructor injection biasa).
    files: ["src/core/application/**/*.ts", "src/modules/*/application/**/*.ts"],
    ignores: ["**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [...FRAMEWORK_IMPORTS, ...DI_LIBRARY, "zod", ...MOCK_IMPORTS] },
      ],
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "I/O lewat port, implementasinya di infrastructure (ADR-0014)." },
      ],
      "no-restricted-properties": [
        "error",
        { object: "Date", property: "now", message: "Pakai port `Clock` (ADR-0015)." },
        { object: "Math", property: "random", message: "Pakai port `RandomSource` (ADR-0015)." },
      ],
    },
  },
  {
    // infrastructure dan platform: tanpa React dan tanpa library DI (kelas hanya menerima dependensi lewat constructor).
    files: ["src/platform/**/*.ts", "src/modules/*/infrastructure/**/*.ts"],
    ignores: ["**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [...FRAMEWORK_IMPORTS, ...DI_LIBRARY, ...MOCK_IMPORTS] },
      ],
    },
  },
  {
    // presentation: tidak mengenal Awilix. Dependensi diambil lewat `useCradle` (ADR-0015).
    files: ["src/ui/**/*.{ts,tsx}", "src/modules/*/presentation/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}", "**/__tests__/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [...DI_LIBRARY, ...MOCK_IMPORTS] }],
      "no-restricted-properties": [
        "error",
        { object: "Date", property: "now", message: "Pakai `clock` dari container (ADR-0015)." },
        { object: "Math", property: "random", message: "Pakai `random` dari container (ADR-0015)." },
      ],
    },
  },
  {
    // Pengecualian: titik masuk mock dan test.
    files: [
      "src/di/AppProviders.tsx",
      "src/instrumentation.ts",
      "src/**/*.test.{ts,tsx}",
      "src/**/__tests__/**",
      "src/test/**",
    ],
    rules: { "no-restricted-imports": "off" },
  },
];

export default boundariesConfig;
