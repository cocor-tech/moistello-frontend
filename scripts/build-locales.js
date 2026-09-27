#!/usr/bin/env node
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

const merged = { en }

codes.forEach((code) => {
  if (code === "en") return
  const filePath = path.join(localeDir, `${code}.json`)
  if (fs.existsSync(filePath)) {
    merged[code] = JSON.parse(fs.readFileSync(filePath, "utf-8"))
  } else {
    merged[code] = { ...en }
  }
})

// Overwrite fr with real translations
const frPath = path.join(localeDir, "fr.json")
if (fs.existsSync(frPath)) {
  merged.fr = JSON.parse(fs.readFileSync(frPath, "utf-8"))
}

fs.writeFileSync(path.join(localeDir, "translations.json"), JSON.stringify(merged))
process.stdout.write(`Built translations.json with ${Object.keys(merged).length} languages, ${Object.keys(en).length} keys each\n`)
