// Next standalone tidak menyalin aset statis dan `public`; keduanya harus ada di samping server.js.
// Pengganti `cp-cli` (menarik yargs-parser dan ansi-regex lama yang ditandai SonarCloud).
import { cpSync } from "node:fs";

cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
cpSync("public", ".next/standalone/public", { recursive: true });
