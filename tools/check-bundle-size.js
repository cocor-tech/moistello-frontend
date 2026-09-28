const fs = require("fs");
const path = require("path");

const DEFAULT_CONFIG_PATH = path.resolve(__dirname, "route-budgets.json");

function loadBudgets(configPath = DEFAULT_CONFIG_PATH) {
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } catch (e) {
      process.stderr.write(`Failed to parse ${configPath}: ${e.message}\n`);
    }
  }
  return {
    defaultRouteBudget: 400000,
    totalBudget: 1200000,
    routes: {},
  };
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function calculateRouteSizes(nextDir) {
  const buildManifestPath = path.join(nextDir, "build-manifest.json");
  const appBuildManifestPath = path.join(nextDir, "app-build-manifest.json");
  const routeSizes = {};

  // Read Pages router manifest if present
  if (fs.existsSync(buildManifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(buildManifestPath, "utf-8"));
      const pages = manifest.pages || {};
      for (const [route, chunks] of Object.entries(pages)) {
        let size = 0;
        for (const chunk of chunks) {
          const chunkPath = path.join(nextDir, chunk);
          if (fs.existsSync(chunkPath)) {
            size += fs.statSync(chunkPath).size;
          }
        }
        routeSizes[route] = size;
      }
    } catch (e) {
      process.stderr.write(`Warning reading build-manifest.json: ${e.message}\n`);
    }
  }

  // Read App router manifest if present
  if (fs.existsSync(appBuildManifestPath)) {
    try {
      const appManifest = JSON.parse(fs.readFileSync(appBuildManifestPath, "utf-8"));
      const pages = appManifest.pages || {};
      for (const [route, chunks] of Object.entries(pages)) {
        let size = 0;
        for (const chunk of chunks) {
          const chunkPath = path.join(nextDir, chunk);
          if (fs.existsSync(chunkPath)) {
            size += fs.statSync(chunkPath).size;
          }
        }
        routeSizes[route] = (routeSizes[route] || 0) + size;
      }
    } catch (e) {
      process.stderr.write(`Warning reading app-build-manifest.json: ${e.message}\n`);
    }
  }

  return routeSizes;
}

function checkBundleSize(options = {}) {
  const nextDir = options.nextDir || path.resolve(process.cwd(), ".next");
  const config = options.config || loadBudgets(options.configPath);
  const totalBudget = process.env.JS_BUDGET ? Number(process.env.JS_BUDGET) : (config.totalBudget || 1200000);

  const chunksDir = path.join(nextDir, "static", "chunks");
  if (!fs.existsSync(chunksDir)) {
    process.stderr.write(`No chunks directory found at ${chunksDir}\n`);
    return { passed: true, totalSize: 0, routeResults: [] };
  }

  // Total static JS size
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

  const allFiles = walk(chunksDir).filter((f) => f.endsWith(".js"));
  let totalSize = 0;
  for (const f of allFiles) {
    totalSize += fs.statSync(f).size;
  }

  const routeSizes = calculateRouteSizes(nextDir);
  const routeResults = [];
  let hasRegression = false;

  for (const [route, size] of Object.entries(routeSizes)) {
    const budget = config.routes[route] || config.defaultRouteBudget || 400000;
    const diff = size - budget;
    const passed = diff <= 0;
    if (!passed) hasRegression = true;

    routeResults.push({
      route,
      size,
      budget,
      diff,
      passed,
    });
  }

  const totalPassed = totalSize <= totalBudget;
  if (!totalPassed) hasRegression = true;

  // Print Formatted Report
  process.stdout.write("\n=======================================================\n");
  process.stdout.write("              BUNDLE SIZE BUDGET REPORT                \n");
  process.stdout.write("=======================================================\n");
  process.stdout.write(`Total JS Size: ${formatBytes(totalSize)} (Budget: ${formatBytes(totalBudget)}) -> ${totalPassed ? "PASS" : "FAIL"}\n\n`);

  if (routeResults.length > 0) {
    process.stdout.write("Route Budgets:\n");
    process.stdout.write("-------------------------------------------------------\n");
    process.stdout.write(
      "Route".padEnd(25) +
      "Size".padEnd(12) +
      "Budget".padEnd(12) +
      "Diff".padEnd(12) +
      "Status" +
      "\n"
    );
    process.stdout.write("-------------------------------------------------------\n");

    for (const r of routeResults) {
      const diffStr = r.diff > 0 ? `+${formatBytes(r.diff)}` : formatBytes(r.diff);
      const statusStr = r.passed ? "✓ PASS" : "✗ FAIL";
      process.stdout.write(
        r.route.padEnd(25) +
        formatBytes(r.size).padEnd(12) +
        formatBytes(r.budget).padEnd(12) +
        diffStr.padEnd(12) +
        statusStr +
        "\n"
      );
    }
    process.stdout.write("=======================================================\n\n");
  }

  if (hasRegression) {
    process.stderr.write("❌ Bundle size budget exceeded! Please check route bundle regressions.\n");
    return { passed: false, totalSize, routeResults };
  }

  process.stdout.write("✅ All bundle size budgets met successfully.\n");
  return { passed: true, totalSize, routeResults };
}

if (require.main === module) {
  const result = checkBundleSize();
  if (!result.passed) {
    process.exit(2);
  }
}

module.exports = { checkBundleSize, calculateRouteSizes, loadBudgets, formatBytes };
