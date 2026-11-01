// Mengompilasi template MJML ke emails/dist; pengirimannya tugas Email_Service di BE.
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import mjml2html from "mjml";

const EMAILS_DIR = path.dirname(fileURLToPath(import.meta.url));

export async function listTemplates() {
  const files = await readdir(EMAILS_DIR);
  return files.filter((file) => file.endsWith(".mjml")).map((file) => path.basename(file, ".mjml"));
}

export async function compileTemplate(name) {
  const filePath = path.join(EMAILS_DIR, `${name}.mjml`);
  const source = await readFile(filePath, "utf8");
  // strict: tag atau atribut yang salah menggagalkan build, bukan menghasilkan email rusak diam-diam.
  const { html } = await mjml2html(source, {
    filePath,
    ignoreIncludes: false,
    includePath: EMAILS_DIR,
    validationLevel: "strict",
  });
  return html;
}

async function main() {
  const outDir = path.join(EMAILS_DIR, "dist");
  await mkdir(outDir, { recursive: true });
  for (const name of await listTemplates()) {
    await writeFile(path.join(outDir, `${name}.html`), await compileTemplate(name));
    console.log(`emails/dist/${name}.html`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
