const fs = require("fs");
const path = require("path");

// Threshold in bytes (e.g., 1.2 MB)
const JS_BUDGET = process.env.JS_BUDGET
  ? Number(process.env.JS_BUDGET)
  : 1200000;

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files = files.concat(walk(full));
    else files.push(full);
  }
  return files;
}

function main() {
  const chunksDir = path.resolve(process.cwd(), ".next", "static", "chunks");
  if (!fs.existsSync(chunksDir)) {
    console.error("No chunks directory found at", chunksDir);
    process.exit(0);
  }
  const files = walk(chunksDir).filter((f) => f.endsWith(".js"));
  let total = 0;
  for (const f of files) {
    const stat = fs.statSync(f);
    total += stat.size;
  }
  console.log(`Bundle JS total size: ${(total / 1024).toFixed(1)} KB`);
  if (total > JS_BUDGET) {
    console.error(
      `JS bundle budget exceeded: ${total} bytes > ${JS_BUDGET} bytes`,
    );
    process.exit(2);
  }
}

main();
