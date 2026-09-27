#!/usr/bin/env node
const fs = require("fs")
const path = require("path")

const src = path.join(__dirname, "..", "src", "lib", "locale")
const dst = path.join(__dirname, "..", "public", "locales")
if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true })

const en = JSON.parse(fs.readFileSync(path.join(src, "en.json"), "utf-8"))
const fr = JSON.parse(fs.readFileSync(path.join(src, "fr.json"), "utf-8"))
const codes = fs.readdirSync(src).filter((name) => name.endsWith(".json") && name !== "translations.json").map((name) => name.slice(0, -5))

for (const code of codes) {
  const file = path.join(src, `${code}.json`)
  const dictionary = code === "en" ? en : code === "fr" ? fr : JSON.parse(fs.readFileSync(file, "utf-8"))
  const dir = path.join(dst, code)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, "common.json"), JSON.stringify(dictionary, null, 2) + "\n")
}

process.stdout.write(`Done: ${codes.length} locales in public/locales/\n`)
