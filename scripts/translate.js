#!/usr/bin/env node
const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

const codes = [
  "aa","ab","ae","af","ak","am","an","ar","as","av","ay","az","ba","be","bg","bh","bi","bm","bn",
  "bo","br","bs","ca","ce","ch","co","cr","cs","cu","cv","cy","da","de","dv","dz","ee","el","eo",
  "es","et","eu","fa","ff","fi","fj","fo","fr","fy","ga","gd","gl","gn","gu","gv","ha","he","hi",
  "ho","hr","ht","hu","hy","hz","ia","id","ie","ig","ii","ik","io","is","it","iu","ja","jv","ka",
  "kg","ki","kj","kk","kl","km","kn","ko","kr","ks","ku","kv","kw","ky","la","lb","lg","li","ln",
  "lo","lt","lu","lv","mg","mh","mi","mk","ml","mn","mr","ms","mt","my","na","nb","nd","ne","ng",
  "nl","nn","no","nr","nv","ny","oc","oj","om","or","os","pa","pi","pl","ps","pt","qu","rm","rn",
  "ro","ru","rw","sa","sc","sd","se","sg","si","sk","sl","sm","sn","so","sq","sr","ss","st","su",
  "sv","sw","ta","te","tg","th","ti","tk","tl","tn","to","tr","ts","tt","tw","ty","ug","uk","ur",
  "uz","ve","vi","vo","wa","wo","xh","yi","yo","za","zh","zu"
]

const localeDir = path.join(__dirname, "..", "src", "lib", "locale")
const en = JSON.parse(fs.readFileSync(path.join(localeDir, "en.json"), "utf-8"))
const enKeys = Object.keys(en)
const enValues = Object.values(en)

function bulkTranslate(text, to) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${to}&dt=t&q=${encodeURIComponent(text)}`
  try {
    const raw = execSync(`curl -s "${url}"`, { timeout: 30000, encoding: "utf-8" })
    const parsed = JSON.parse(raw)
    if (!parsed[0]) return null
    // Each segment in parsed[0] corresponds to a line
    const lines = parsed[0].map((seg) => seg[0] || "").join("").trim()
    return lines
  } catch { return null }
}

const GT_MAP = {
  "aa":"aa","ab":"ab","af":"af","ak":"ak","am":"am","an":"an","ar":"ar","as":"as","av":"av","ay":"ay",
  "az":"az","ba":"ba","be":"be","bg":"bg","bh":"bh","bi":"bi","bm":"bm","bn":"bn","bo":"bo","br":"br","bs":"bs",
  "ca":"ca","ce":"ce","ch":"ch","co":"co","cr":"cr","cs":"cs","cu":"cu","cv":"cv","cy":"cy","da":"da","de":"de",
  "dv":"dv","dz":"dz","ee":"ee","el":"el","eo":"eo","es":"es","et":"et","eu":"eu","fa":"fa","ff":"ff","fi":"fi",
  "fj":"fj","fo":"fo","fr":"fr","fy":"fy","ga":"ga","gd":"gd","gl":"gl","gn":"gn","gu":"gu","gv":"gv","ha":"ha",
  "he":"iw","hi":"hi","ho":"ho","hr":"hr","ht":"ht","hu":"hu","hy":"hy","hz":"hz","ia":"ia","id":"id","ie":"ie",
  "ig":"ig","ii":"ii","ik":"ik","io":"io","is":"is","it":"it","iu":"iu","ja":"ja","jv":"jv","ka":"ka","kg":"kg",
  "ki":"ki","kj":"kj","kk":"kk","kl":"kl","km":"km","kn":"kn","ko":"ko","kr":"kr","ks":"ks","ku":"ku","kv":"kv",
  "kw":"kw","ky":"ky","la":"la","lb":"lb","lg":"lg","li":"li","ln":"ln","lo":"lo","lt":"lt","lu":"lu","lv":"lv",
  "mg":"mg","mh":"mh","mi":"mi","mk":"mk","ml":"ml","mn":"mn","mr":"mr","ms":"ms","mt":"mt","my":"my","na":"na",
  "nb":"nb","nd":"nd","ne":"ne","ng":"ng","nl":"nl","nn":"nn","no":"no","nr":"nr","nv":"nv","ny":"ny","oc":"oc",
  "oj":"oj","om":"om","or":"or","os":"os","pa":"pa","pi":"pi","pl":"pl","ps":"ps","pt":"pt","qu":"qu","rm":"rm",
  "rn":"rn","ro":"ro","ru":"ru","rw":"rw","sa":"sa","sc":"sc","sd":"sd","se":"se","sg":"sg","si":"si","sk":"sk",
  "sl":"sl","sm":"sm","sn":"sn","so":"so","sq":"sq","sr":"sr","ss":"ss","st":"st","su":"su","sv":"sv","sw":"sw",
  "ta":"ta","te":"te","tg":"tg","th":"th","ti":"ti","tk":"tk","tl":"tl","tn":"tn","to":"to","tr":"tr","ts":"ts",
  "tt":"tt","tw":"tw","ty":"ty","ug":"ug","uk":"uk","ur":"ur","uz":"uz","ve":"ve","vi":"vi","vo":"vo","wa":"wa",
  "wo":"wo","xh":"xh","yi":"yi","yo":"yo","za":"za","zh":"zh-CN","zu":"zu"
}

async function main() {
  const allData = { en }

  for (let idx = 0; idx < codes.length; idx++) {
    const code = codes[idx]
    if (code === "en") continue

    const gtCode = GT_MAP[code]
    if (!gtCode) {
      process.stdout.write(`[${idx+1}/${codes.length}] ${code}: unsupported, using English\n`)
      allData[code] = { ...en }
      continue
    }

    // Join all values with newlines for bulk translate
    const bulk = enValues.join("\n")
    const translated = bulkTranslate(bulk, gtCode)

    if (translated === null) {
      process.stdout.write(`[${idx+1}/${codes.length}] ${code}: failed, using English\n`)
      allData[code] = { ...en }
      await new Promise((r) => setTimeout(r, 1000))
      continue
    }

    const lines = translated.split("\n").map((l) => l.trim()).filter(Boolean)
    if (lines.length >= enKeys.length) {
      const obj = {}
      enKeys.forEach((key, i) => { obj[key] = lines[i] || enValues[i] })
      allData[code] = obj
      process.stdout.write(`[${idx+1}/${codes.length}] ${code}: ✓ (${lines.length} lines)\n`)
    } else {
      // Try per-key fallback
      process.stdout.write(`[${idx+1}/${codes.length}] ${code}: only ${lines.length}/${enKeys.length} lines, using English\n`)
      allData[code] = { ...en }
    }

    // Delay between languages
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400))
  }

  // Restore real French
  const frPath = path.join(localeDir, "fr.json")
  if (fs.existsSync(frPath)) {
    allData.fr = JSON.parse(fs.readFileSync(frPath, "utf-8"))
  }

  fs.writeFileSync(path.join(localeDir, "translations.json"), JSON.stringify(allData, null, 2))
  process.stdout.write(`\nDone! ${Object.keys(allData).length} languages in translations.json\n`)
}

main().catch((error) => {
  process.stderr.write(`${error?.message ?? error}\n`)
  process.exitCode = 1
})
