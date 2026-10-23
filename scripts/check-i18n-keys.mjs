import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const srcDir = path.join(__dirname, "..", "src")
const localeFile = path.join(srcDir, "lib", "locale", "en.json")
const baselineFile = path.join(__dirname, "i18n-baseline.json")

const en = JSON.parse(fs.readFileSync(localeFile, "utf8"))
const definedKeys = new Set(Object.keys(en))

// Load baseline of known existing gaps if file exists
let baselinedKeys = new Set()
if (fs.existsSync(baselineFile)) {
  try {
    const rawBaseline = JSON.parse(fs.readFileSync(baselineFile, "utf8"))
    baselinedKeys = new Set(rawBaseline.untranslated || rawBaseline)
  } catch {
    baselinedKeys = new Set()
  }
}

// Regex to capture t("key") or t('key') or t(`key`)
// Supports t("auth.login"), t('nav.home'), i18n.t("key"), etc.
const KEY_REGEX = /\b(?:t|translate)\(\s*["'`]([a-zA-Z0-9_.-]+)["'`]/g

function scanDir(dir, found = new Map()) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "coverage") continue
      scanDir(fullPath, found)
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      // Skip test files from untranslated checks unless desired
      if (entry.name.includes(".test.") || entry.name.includes(".spec.")) continue
      const content = fs.readFileSync(fullPath, "utf8")
      let match
      while ((match = KEY_REGEX.exec(content)) !== null) {
        const key = match[1]
        // Filter out non-translation strings like single numbers or CSS variables
        if (!key || key.length < 2) continue
        if (!found.has(key)) {
          found.set(key, [])
        }
        found.get(key).push(`${path.relative(srcDir, fullPath)}`)
      }
    }
  }
  return found
}

const referencedKeys = scanDir(srcDir)
const missingKeys = []
const newlyMissingKeys = []

for (const [key, files] of referencedKeys.entries()) {
  if (!definedKeys.has(key)) {
    missingKeys.push({ key, files: Array.from(new Set(files)) })
    if (!baselinedKeys.has(key)) {
      newlyMissingKeys.push({ key, files: Array.from(new Set(files)) })
    }
  }
}

if (process.env.UPDATE_BASELINE === "true") {
  const allMissing = Array.from(new Set(missingKeys.map((m) => m.key))).sort()
  fs.writeFileSync(baselineFile, JSON.stringify({ untranslated: allMissing }, null, 2) + "\n")
  console.log(`[i18n check] Updated baseline with ${allMissing.length} keys in ${path.relative(process.cwd(), baselineFile)}`)
  process.exit(0)
}

console.log(`[i18n check] Scanned ${referencedKeys.size} distinct translation keys in code.`)
console.log(`[i18n check] Locale file has ${definedKeys.size} keys.`)

if (newlyMissingKeys.length > 0) {
  console.error(`\n❌ Error: Found ${newlyMissingKeys.length} newly introduced untranslated key(s) in code:`)
  for (const { key, files } of newlyMissingKeys) {
    console.error(`  - "${key}" in: ${files.join(", ")}`)
  }
  console.error(`\nPlease add these keys to src/lib/locale/en.json (or update baseline with UPDATE_BASELINE=true if intentional).\n`)
  process.exit(1)
}

if (missingKeys.length > 0) {
  console.log(`ℹ️ Notice: ${missingKeys.length} known missing keys are baselined in scripts/i18n-baseline.json.`)
}

console.log(`✅ All referenced translation keys are accounted for!`)
process.exit(0)
