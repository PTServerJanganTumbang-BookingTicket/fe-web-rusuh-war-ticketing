import { readdirSync } from "node:fs";

// Urutan impor DI DALAM satu lapisan. boundaries.mjs menjaga arah antar package (app → features → ui/api/i18n → core);
// berkas ini menjaga arah antar folder di dalam features, ui, dan api. Memakai `import/no-restricted-paths` (bukan
// `no-restricted-imports`) supaya tidak menimpa aturan impor lain milik file yang sama. Daftar folder dibaca dari disk,
// jadi fitur atau layar baru otomatis ikut dijaga. Lihat ADR-0002 (catatan 2026-10-22).

const root = new URL("../../../", import.meta.url);
const dirs = (relative) =>
  readdirSync(new URL(relative, root), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("__"))
    .map((entry) => entry.name);

const features = "apps/web/features";
const ui = "packages/ui/src";
const api = "packages/api/src";

const featureDirs = dirs(`${features}/`).filter((name) => name !== "shared");
const uiScreens = dirs(`${ui}/`).filter((name) => !["lib", "primitives", "shared"].includes(name));

const zones = [
  // features: irisan vertikal tidak saling mengenal. Yang dipakai bersama ditaruh di features/shared, dan shared tidak mengenal fitur.
  ...featureDirs.map((name) => ({
    target: `${features}/${name}`,
    from: featureDirs.filter((other) => other !== name).map((other) => `${features}/${other}`),
    message: `Fitur "${name}" tidak boleh mengimpor fitur lain. Pindahkan yang dipakai bersama ke features/shared.`,
  })),
  { target: `${features}/shared`, from: featureDirs.map((name) => `${features}/${name}`), message: "features/shared tidak boleh mengimpor sebuah fitur." },

  // ui: lib ← primitives ← shared ← layar. Layar tidak saling mengimpor.
  { target: `${ui}/lib`, from: [`${ui}/primitives`, `${ui}/shared`, ...uiScreens.map((n) => `${ui}/${n}`)], message: "ui/lib adalah daun: tidak mengimpor folder ui lain." },
  { target: `${ui}/primitives`, from: [`${ui}/shared`, ...uiScreens.map((n) => `${ui}/${n}`)], message: "Primitif tidak boleh mengimpor komponen shared atau layar." },
  { target: `${ui}/shared`, from: uiScreens.map((n) => `${ui}/${n}`), message: "ui/shared tidak boleh mengimpor layar." },
  ...uiScreens.map((name) => ({
    target: `${ui}/${name}`,
    from: uiScreens.filter((other) => other !== name).map((other) => `${ui}/${other}`),
    message: `Layar "${name}" tidak boleh mengimpor layar lain. Pindahkan yang dipakai bersama ke ui/shared.`,
  })),

  // api: contracts ← mappers ← adapters ← queries, dan http ← adapters (ADR-0017). Contract hanya schema zod;
  // mapper satu-satunya yang tahu nama field BE; client HTTP tidak mengenal adapter, contract, atau mapper.
  { target: `${api}/contracts`, from: [`${api}/mappers`, `${api}/adapters`, `${api}/http`, `${api}/queries.ts`, `${api}/queryKeys.ts`], message: "Contract hanya berisi schema DTO: tidak mengimpor mapper, adapter, http, atau query." },
  { target: `${api}/mappers`, from: [`${api}/adapters`, `${api}/http`, `${api}/queries.ts`, `${api}/queryKeys.ts`], message: "Mapper murni DTO → domain: tidak mengimpor adapter, http, atau query." },
  { target: `${api}/http`, from: [`${api}/adapters`, `${api}/contracts`, `${api}/mappers`, `${api}/queries.ts`, `${api}/queryKeys.ts`], message: "Client HTTP tidak boleh mengimpor adapter, contract, mapper, atau query." },
  { target: `${api}/adapters`, from: [`${api}/queries.ts`, `${api}/queryKeys.ts`], message: "Adapter tidak boleh mengimpor query options." },
];

const layersConfig = [
  {
    files: [`${features}/**/*.{ts,tsx}`, `${ui}/**/*.{ts,tsx}`, `${api}/**/*.ts`],
    rules: { "import/no-restricted-paths": ["error", { zones }] },
  },
  {
    // Alias `@/*` milik apps/web harus ter-resolve agar `@/features/x` tidak lolos dari aturan antar fitur.
    files: [`${features}/**/*.{ts,tsx}`],
    settings: { "import/resolver": { typescript: { project: "apps/web/tsconfig.json" }, node: true } },
  },
];

export default layersConfig;
