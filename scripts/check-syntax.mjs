// Verifica sintaxis de todos los JS sin navegador: node scripts/check-syntax.mjs
import { readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".js") ? [p] : [];
  });
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let failed = 0;
for (const file of walk(join(ROOT, "js"))) {
  const r = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (r.status !== 0) {
    failed++;
    console.error(`✗ ${file}\n${r.stderr}`);
  }
}
console.log(failed ? `${failed} archivo(s) con error de sintaxis` : "Sintaxis OK en todos los archivos");
process.exit(failed ? 1 : 0);
