import boundaries from "eslint-plugin-boundaries";

// Aturan dependensi Clean Architecture per modul (ADR-0014) dan DI (ADR-0015).
//
//   app ─► di ─► <m>.module.ts ─► data ─► application ─► domain
//    │                                        ▲             ▲
//    └──► views/*Container ─► controllers ─(import type)────┘
//
// Modul tidak saling mengimpor. Yang dipakai bersama ada di `src/core`, dengan lapisan yang sama
// seperti modul: domain, application, data, controllers, dan i18n. `src/core` tidak punya view: komponen tampilan
// bersama ada di design system (`src/components/ui`), dan layar milik modul.

const SAME_MODULE = { module: "{{ from.element.captured.module }}" };

const el = (type, captured) => ({ element: captured ? { type, captured } : { type } });
const anyOf = (...types) => ({ element: { types: { anyOf: types } } });
const allow = (from, ...to) => ({ from, allow: { to } });
const allowTypes = (from, ...to) => ({ from, dependency: { kind: "type" }, allow: { to } });

const MOCK_IMPORTS = ["@/mocks", "@/mocks/*"];
const FRAMEWORK_IMPORTS = ["react", "react-dom", "react/*", "next", "next/*", "@tanstack/*"];
const DI_LIBRARY = ["awilix"];

const SRC = "src/**/*.{ts,tsx}";

// Yang boleh dipakai controller dan Container dari `src/core` (sisi tampilan).
const CORE_UI = ["core-domain", "core-controller", "core-i18n", "design-system"];

const boundariesConfig = [
  {
    files: [SRC],
    plugins: { boundaries },
    settings: {
      "import/resolver": { typescript: { project: "./tsconfig.json" } },
      "boundaries/include": ["src/**/*"],
      "boundaries/elements": [
        // Kode bersama. Urutan penting: pola yang lebih spesifik lebih dulu.
        { type: "core-domain", pattern: "src/core/domain/**" },
        { type: "core-application", pattern: "src/core/application/**" },
        { type: "core-data", pattern: "src/core/data/**" },
        { type: "core-controller", pattern: "src/core/controllers/**" },
        { type: "core-i18n", pattern: "src/core/i18n/**" },
        // Design system di src/components/ui
        { type: "design-system", pattern: "src/components/ui/**" },
        // Modul fitur. `module` ditangkap supaya aturan bisa membatasi ke modul yang sama.
        { type: "domain", pattern: "src/modules/*/domain/**", capture: ["module"] },
        { type: "application", pattern: "src/modules/*/application/**", capture: ["module"] },
        { type: "data", pattern: "src/modules/*/data/**", capture: ["module"] },
        { type: "controller", pattern: "src/modules/*/controllers/**", capture: ["module"] },
        // `mode: "file"` supaya pola dicocokkan per file, bukan per folder. Deprecated di plugin v7 (masih jalan).
        {
          type: "container",
          pattern: "src/modules/*/views/*Container.tsx",
          mode: "file",
          capture: ["module"],
        },
        { type: "view", pattern: "src/modules/*/views/**", capture: ["module"] },
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
            // core: aturan arah yang sama dengan modul.
            allow(el("core-domain"), el("core-domain")),
            allow(el("core-application"), anyOf("core-domain", "core-application")),
            allow(el("core-data"), anyOf("core-domain", "core-application", "core-data")),
            allow(el("design-system"), el("design-system")),
            allow(el("core-i18n"), anyOf("core-domain", "core-i18n")),
            allow(el("core-controller"), anyOf("core-domain", "core-controller", "core-i18n")),
            allowTypes(el("core-controller"), el("core-application")),

            // Domain: model, rules, constants, protocol. Hanya domain modul sendiri dan core domain.
            allow(el("domain"), el("core-domain"), el("domain", SAME_MODULE)),
            // Application: use case. Bergantung ke dalam saja.
            allow(
              el("application"),
              anyOf("core-domain", "core-application"),
              el("domain", SAME_MODULE),
              el("application", SAME_MODULE),
            ),
            // Data: service yang mengimplementasikan protocol, beserta schema zod.
            allow(
              el("data"),
              anyOf("core-domain", "core-application", "core-data"),
              el("domain", SAME_MODULE),
              el("application", SAME_MODULE),
              el("data", SAME_MODULE),
            ),
            // View: props-only. Hanya design system dan view modul sendiri; domain hanya tipe.
            allow(el("view"), el("design-system"), el("view", SAME_MODULE)),
            allowTypes(el("view"), el("domain", SAME_MODULE)),
            // Controller: hook state + mapper + query options. Use case datang dari container,
            // jadi `application` hanya boleh diimpor sebagai tipe (DIP).
            allow(
              el("controller"),
              anyOf(...CORE_UI),
              el("domain", SAME_MODULE),
              el("controller", SAME_MODULE),
              el("view", SAME_MODULE),
            ),
            allowTypes(el("controller"), el("core-application"), el("application", SAME_MODULE)),
            // Container: satu-satunya view yang memanggil controller, lalu memilih View.
            allow(
              el("container"),
              anyOf(...CORE_UI),
              el("domain", SAME_MODULE),
              el("controller", SAME_MODULE),
              el("view", SAME_MODULE),
            ),
            allowTypes(el("container"), el("core-application"), el("application", SAME_MODULE)),
            // Registrasi modul: memasangkan service ke protocol milik modul itu sendiri.
            allow(
              el("module-root"),
              anyOf("core-domain", "core-application", "core-data"),
              el("domain", SAME_MODULE),
              el("application", SAME_MODULE),
              el("data", SAME_MODULE),
            ),
            // Composition root.
            allow(el("di"), anyOf("di", "module-root", "core-application", "core-data", "mocks", ...CORE_UI)),
            // Framework (Next.js): routing, layout, route handler, proxy.
            allow(
              el("app"),
              anyOf("app", "di", "controller", "container", "view", "core-data", "mocks", ...CORE_UI),
            ),
            allow(el("mocks"), el("mocks")),
            allow(el("test-support"), anyOf("di", "mocks", "core-application", "core-data", ...CORE_UI)),
          ],
        },
      ],
    },
  },
  {
    // Test boleh merakit apa saja (fake, container uji, MSW); aturan lapisan berlaku untuk kode produksi.
    files: ["src/**/*.test.{ts,tsx}"],
    rules: { "boundaries/dependencies": "off" },
  },
  {
    // Mock hanya boleh dimuat dari titik masuk yang menjaganya dengan NEXT_PUBLIC_API_MOCKING, dan dari test.
    files: [SRC],
    rules: { "no-restricted-imports": ["error", { patterns: MOCK_IMPORTS }] },
  },
  {
    // design system dan view: hanya token desain, tidak ada nilai warna mentah (token Signal, bukan hex)
    files: ["src/components/ui/**/*.{ts,tsx}", "src/modules/*/views/**/*.tsx"],
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
    // application: use case. Tanpa framework, HTTP, atau library DI (constructor injection biasa).
    files: ["src/core/application/**/*.ts", "src/modules/*/application/**/*.ts"],
    ignores: ["**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [...FRAMEWORK_IMPORTS, ...DI_LIBRARY, "zod", ...MOCK_IMPORTS] },
      ],
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "I/O lewat protocol, implementasinya service di data (ADR-0014)." },
      ],
      "no-restricted-properties": [
        "error",
        { object: "Date", property: "now", message: "Pakai `ClockProtocol` (ADR-0015)." },
        { object: "Math", property: "random", message: "Pakai `RandomProtocol` (ADR-0015)." },
      ],
    },
  },
  {
    // data: tanpa React dan tanpa library DI (kelas hanya menerima dependensi lewat constructor).
    files: ["src/core/data/**/*.ts", "src/modules/*/data/**/*.ts"],
    ignores: ["**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [...FRAMEWORK_IMPORTS, ...DI_LIBRARY, ...MOCK_IMPORTS] },
      ],
    },
  },
  {
    // controllers dan views: tidak mengenal Awilix. Dependensi diambil lewat `useDependencies` (ADR-0015).
    files: ["src/core/{controllers,i18n}/**/*.{ts,tsx}", "src/modules/*/{controllers,views}/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}"],
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
    files: ["src/di/AppProviders.tsx", "src/instrumentation.ts", "src/**/*.test.{ts,tsx}", "src/test/**"],
    rules: { "no-restricted-imports": "off" },
  },
];

export default boundariesConfig;
