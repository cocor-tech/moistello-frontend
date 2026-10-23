import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"
import { execSync } from "child_process"

describe("i18n untranslated keys detector (#478)", () => {
  it("runs the CI check script successfully against the repository", () => {
    const scriptPath = path.resolve(process.cwd(), "scripts/check-i18n-keys.mjs")
    expect(fs.existsSync(scriptPath)).toBe(true)

    // Execute the check script
    const output = execSync(`node ${scriptPath}`, { encoding: "utf8" })
    expect(output).toContain("[i18n check]")
    expect(output).toContain("All referenced translation keys are accounted for")
  })

  it("fails when an un-baselined missing key is introduced", () => {
    const tempFile = path.resolve(process.cwd(), "src/temp-missing-key-test.tsx")
    try {
      fs.writeFileSync(
        tempFile,
        'import { useTranslate } from "@/lib/locale/context";\nexport function Dummy() { const { t } = useTranslate(); return <div>{t("untranslated.nonexistent.test.key")}</div>; }\n'
      )

      let threw = false
      try {
        execSync(`node scripts/check-i18n-keys.mjs`, { encoding: "utf8", stdio: "pipe" })
      } catch (err: unknown) {
        threw = true
        const stderr = (err as { stderr?: string; stdout?: string }).stderr || (err as { stdout?: string }).stdout || ""
        expect(stderr).toContain("untranslated.nonexistent.test.key")
      }
      expect(threw).toBe(true)
    } finally {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile)
      }
    }
  })
})
