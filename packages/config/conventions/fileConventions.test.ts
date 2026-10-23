import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Konvensi letak dan nama file (docs/ai/steering/architecture-rules.md, "Letak dan nama file"). Peran file ditentukan
// folder dan pola nama, bukan akhiran seperti `.usecase.ts`. Test ini membaca disk, jadi fitur dan file baru otomatis ikut dijaga.

const root = fileURLToPath(new URL("../../../", import.meta.url));
const at = (...parts: string[]) => join(root, ...parts);
const rel = (path: string) => relative(root, path).replaceAll("\\", "/");

const isDir = (path: string) => statSync(path).isDirectory();
const entries = (dir: string) => (existsSync(dir) ? readdirSync(dir) : []);
const sourceFiles = (dir: string) => entries(dir).filter((name) => /\.tsx?$/.test(name) && !isDir(join(dir, name)));
const stem = (file: string) => file.replace(/\.tsx?$/, "");
const hasTest = (dir: string, file: string) =>
  ["ts", "tsx"].some((ext) => existsSync(join(dir, "__tests__", `${stem(file)}.test.${ext}`)));
const lowerFirst = (value: string) => value.charAt(0).toLowerCase() + value.slice(1);

/** Semua folder `__tests__` di bawah `dir`, kecuali node_modules. */
function testDirs(dir: string): string[] {
  return entries(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === "node_modules" || !isDir(path)) return [];
    return name === "__tests__" ? [path, ...testDirs(path)] : testDirs(path);
  });
}

const FEATURES = at("apps/web/features");
const featureDirs = entries(FEATURES).filter((name) => name !== "shared" && !name.startsWith("__") && isDir(join(FEATURES, name)));

/** Pola file di folder fitur (ADR-0003, ADR-0017). */
const FEATURE_FILE = [
  /^[A-Z]\w*Container\.tsx$/, // Container: render View sesuai state
  /^use[A-Z]\w*ViewModel\.ts$/, // ViewModel: hook, mengembalikan { state, actions }
  /^to[A-Z]\w*Props\.ts$/, // Mapper murni ke props View: to<Screen>ViewProps atau to<Komponen>Props
  /^[a-z]\w*Model\.ts$/, // Screen model: <Screen>ScreenState + derive<Screen>ScreenState
  /^load[A-Z]\w*\.ts$/, // Loader Server Component (Home, ADR-0007)
];

describe("folder fitur (apps/web/features/<fitur>)", () => {
  it.each(featureDirs)("%s: hanya Container, ViewModel, mapper, screen model, dan loader", (feature) => {
    const dir = join(FEATURES, feature);
    const unexpected = entries(dir).filter((name) => {
      if (name === "__tests__") return false;
      if (isDir(join(dir, name))) return true;
      return !FEATURE_FILE.some((pattern) => pattern.test(name));
    });
    expect(unexpected, `pindahkan ke features/shared, core, atau ui, atau ikuti pola nama`).toEqual([]);
  });

  it.each(featureDirs)("%s: setiap ViewModel punya screen model dan mapper dengan nama yang sama", (feature) => {
    const dir = join(FEATURES, feature);
    const problems = sourceFiles(dir)
      .map((file) => /^use([A-Z]\w*)ViewModel\.ts$/.exec(file)?.[1])
      .filter((screen): screen is string => screen !== undefined)
      .flatMap((screen) => {
        const missing: string[] = [];
        const viewModel = readFileSync(join(dir, `use${screen}ViewModel.ts`), "utf8");
        if (!new RegExp(`export type ${screen}ViewModel\\b`).test(viewModel)) missing.push(`type ${screen}ViewModel`);
        const model = join(dir, `${lowerFirst(screen)}Model.ts`);
        if (!existsSync(model)) missing.push(`${lowerFirst(screen)}Model.ts`);
        else {
          const source = readFileSync(model, "utf8");
          if (!new RegExp(`export type ${screen}ScreenState\\b`).test(source)) missing.push(`type ${screen}ScreenState`);
          if (!new RegExp(`export function derive${screen}ScreenState\\b`).test(source)) missing.push(`derive${screen}ScreenState`);
        }
        if (!existsSync(join(dir, `to${screen}ViewProps.ts`))) missing.push(`to${screen}ViewProps.ts`);
        return missing.map((item) => `${feature}/${screen}: ${item}`);
      });
    expect(problems).toEqual([]);
  });

  it.each(featureDirs)("%s: ViewModel, screen model, dan mapper punya test sendiri", (feature) => {
    const dir = join(FEATURES, feature);
    const untested = sourceFiles(dir).filter((file) => /^(use\w+ViewModel|\w+Model|to\w+Props)\.ts$/.test(file) && !hasTest(dir, file));
    expect(untested).toEqual([]);
  });
});

describe("packages", () => {
  it("core/application: setiap use case punya test sendiri", () => {
    const dir = at("packages/core/src/application");
    const untested = sourceFiles(dir).filter((file) => !["index.ts", "ports.ts"].includes(file) && !hasTest(dir, file));
    expect(untested).toEqual([]);
  });

  it.each(["adapters", "mappers"])("api/%s: setiap file punya test sendiri", (layer) => {
    const dir = at("packages/api/src", layer);
    expect(sourceFiles(dir).filter((file) => !hasTest(dir, file))).toEqual([]);
  });

  it("api: contract dan mapper berpasangan per resource", () => {
    const contracts = sourceFiles(at("packages/api/src/contracts")).sort();
    const mappers = sourceFiles(at("packages/api/src/mappers")).sort();
    expect(contracts).toEqual(mappers);
  });
});

describe("test", () => {
  const dirs = [at("packages"), at("apps/web/features")].flatMap(testDirs);

  it("setiap file test menguji satu file sumber di folder induknya (bukan gabungan)", () => {
    const orphans = dirs.flatMap((dir) =>
      entries(dir)
        .filter((name) => /\.test\.tsx?$/.test(name))
        .filter((name) => {
          const source = name.replace(/\.test\.tsx?$/, "");
          return !["ts", "tsx"].some((ext) => existsSync(join(dir, "..", `${source}.${ext}`)));
        })
        .map((name) => rel(join(dir, name))),
    );
    expect(orphans).toEqual([]);
  });

  it("isi __tests__ selain test hanya helper support", () => {
    const extra = dirs.flatMap((dir) =>
      entries(dir)
        .filter((name) => !/\.test\.tsx?$/.test(name) && !/^support\.tsx?$/.test(name) && !isDir(join(dir, name)))
        .map((name) => rel(join(dir, name))),
    );
    expect(extra).toEqual([]);
  });
});
