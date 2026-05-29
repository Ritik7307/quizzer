import { rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");

for (const dir of [".next", join("node_modules", ".cache")]) {
  try {
    rmSync(join(root, dir), { recursive: true, force: true });
    console.log(`Removed ${dir}`);
  } catch {
    /* ignore */
  }
}

console.log("Clean complete. Run: npm run dev");
