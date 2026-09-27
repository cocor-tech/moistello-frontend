"use client"

import React, { useId, useRef, useState } from "react"
import { useTranslate } from "@/lib/locale/context"

const LANGUAGES = [
  "en", "aa", "ab", "ae", "af", "ak", "am", "an", "ar", "as",
  "av", "ay", "az", "ba", "be", "bg", "bh", "bi", "bm", "bn",
  "bo", "br", "bs", "ca", "ce", "ch", "co", "cr", "cs", "cu",
  "cv", "cy", "da", "de", "dv", "dz", "ee", "el", "eo", "es",
  "et", "eu", "fa", "ff", "fi", "fj", "fo", "fr", "fy", "ga",
  "gd", "gl", "gn", "gu", "gv", "ha", "he", "hi", "ho", "hr",
  "ht", "hu", "hy", "hz", "ia", "id", "ie", "ig", "ii", "ik",
  "io", "is", "it", "iu", "ja", "jv", "ka", "kg", "ki", "kj",
  "kk", "kl", "km", "kn", "ko", "kr", "ks", "ku", "kv", "kw",
  "ky", "la", "lb", "lg", "li", "ln", "lo", "lt", "lu", "lv",
  "mg", "mh", "mi", "mk", "ml", "mn", "mr", "ms", "mt", "my",
  "na", "nb", "nd", "ne", "ng", "nl", "nn", "no", "nr", "nv",
  "ny", "oc", "oj", "om", "or", "os", "pa", "pi", "pl", "ps",
  "pt", "qu", "rm", "rn", "ro", "ru", "rw", "sa", "sc", "sd",
  "se", "sg", "si", "sk", "sl", "sm", "sn", "so", "sq", "sr",
  "ss", "st", "su", "sv", "sw", "ta", "te", "tg", "th", "ti",
  "tk", "tl", "tn", "to", "tr", "ts", "tt", "tw", "ty", "ug",
  "uk", "ur", "uz", "ve", "vi", "vo", "wa", "wo", "xh", "yi",
  "yo", "za", "zh", "zu",
]

interface ProfileStepProps {
  displayName: string
  language: string
  onUpdateLanguage: (lang: string) => void
  onSubmit: () => void
  isSubmitting?: boolean
}

const LANG_NAMES: Record<string, string> = {
  aa:"Afar",ab:"Abkhazian",ae:"Avestan",af:"Afrikaans",ak:"Akan",am:"Amharic",an:"Aragonese",ar:"Arabic",
  as:"Assamese",av:"Avaric",ay:"Aymara",az:"Azerbaijani",ba:"Bashkir",be:"Belarusian",bg:"Bulgarian",
  bh:"Bhojpuri",bi:"Bislama",bm:"Bambara",bn:"Bangla",bo:"Tibetan",br:"Breton",bs:"Bosnian",ca:"Catalan",
  ce:"Chechen",ch:"Chamorro",co:"Corsican",cr:"Cree",cs:"Czech",cu:"Church Slavic",cv:"Chuvash",cy:"Welsh",
  da:"Danish",de:"German",dv:"Divehi",dz:"Dzongkha",ee:"Ewe",el:"Greek",eo:"Esperanto",es:"Spanish",
  et:"Estonian",eu:"Basque",fa:"Persian",ff:"Fula",fi:"Finnish",fj:"Fijian",fo:"Faroese",fr:"French",
  fy:"Western Frisian",ga:"Irish",gd:"Scottish Gaelic",gl:"Galician",gn:"Guarani",gu:"Gujarati",gv:"Manx",
  ha:"Hausa",he:"Hebrew",hi:"Hindi",ho:"Hiri Motu",hr:"Croatian",ht:"Haitian Creole",hu:"Hungarian",
  hy:"Armenian",hz:"Herero",ia:"Interlingua",id:"Indonesian",ie:"Interlingue",ig:"Igbo",ii:"Sichuan Yi",
  ik:"Inupiaq",io:"Ido",is:"Icelandic",it:"Italian",iu:"Inuktitut",ja:"Japanese",jv:"Javanese",ka:"Georgian",
  kg:"Kongo",ki:"Kikuyu",kj:"Kuanyama",kk:"Kazakh",kl:"Kalaallisut",km:"Khmer",kn:"Kannada",ko:"Korean",
  kr:"Kanuri",ks:"Kashmiri",ku:"Kurdish",kv:"Komi",kw:"Cornish",ky:"Kyrgyz",la:"Latin",lb:"Luxembourgish",
  lg:"Ganda",li:"Limburgish",ln:"Lingala",lo:"Lao",lt:"Lithuanian",lu:"Luba-Katanga",lv:"Latvian",
  mg:"Malagasy",mh:"Marshallese",mi:"Māori",mk:"Macedonian",ml:"Malayalam",mn:"Mongolian",mr:"Marathi",
  ms:"Malay",mt:"Maltese",my:"Burmese",na:"Nauru",nb:"Norwegian Bokmål",nd:"North Ndebele",ne:"Nepali",
  ng:"Ndonga",nl:"Dutch",nn:"Norwegian Nynorsk",no:"Norwegian",nr:"South Ndebele",nv:"Navajo",ny:"Nyanja",
  oc:"Occitan",oj:"Ojibwa",om:"Oromo",or:"Odia",os:"Ossetic",pa:"Punjabi",pi:"Pali",pl:"Polish",
  ps:"Pashto",pt:"Portuguese",qu:"Quechua",rm:"Romansh",rn:"Rundi",ro:"Romanian",ru:"Russian",rw:"Kinyarwanda",
  sa:"Sanskrit",sc:"Sardinian",sd:"Sindhi",se:"Northern Sami",sg:"Sango",si:"Sinhala",sk:"Slovak",
  sl:"Slovenian",sm:"Samoan",sn:"Shona",so:"Somali",sq:"Albanian",sr:"Serbian",ss:"Swati",
  st:"Southern Sotho",su:"Sundanese",sv:"Swedish",sw:"Swahili",ta:"Tamil",te:"Telugu",tg:"Tajik",th:"Thai",
  ti:"Tigrinya",tk:"Turkmen",tl:"Filipino",tn:"Tswana",to:"Tongan",tr:"Turkish",ts:"Tsonga",tt:"Tatar",
  tw:"Akan",ty:"Tahitian",ug:"Uyghur",uk:"Ukrainian",ur:"Urdu",uz:"Uzbek",ve:"Venda",vi:"Vietnamese",
  vo:"Volapük",wa:"Walloon",wo:"Wolof",xh:"Xhosa",yi:"Yiddish",yo:"Yoruba",za:"Zhuang",zh:"Chinese",zu:"Zulu",
}

function langLabel(code: string): string {
  return LANG_NAMES[code] ?? code
}

const TAB_FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",")

function getTabbableElements(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(TAB_FOCUSABLE_SELECTOR))
    .filter((element) => element.tabIndex >= 0)
}

export function ProfileStep({
  displayName,
  language,
  onUpdateLanguage,
  onSubmit,
  isSubmitting = false,
}: ProfileStepProps) {
  const { t, setLocale } = useTranslate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const focusOnOpenRef = useRef<string | null>(null)
  const id = useId().replace(/:/g, "")
  const triggerId = `${id}-language-trigger`
  const labelId = `${id}-language-label`
  const listboxId = `${id}-language-options`

  const close = React.useCallback(() => {
    focusOnOpenRef.current = null
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  const focusLanguage = React.useCallback((value: string) => {
    optionRefs.current[value]?.focus()
  }, [])

  const focusAfterRender = React.useCallback((value: string) => {
    if (typeof window === "undefined") return
    window.requestAnimationFrame(() => focusLanguage(value))
  }, [focusLanguage])

  const handleTab = (event: React.KeyboardEvent<HTMLElement>) => {
    const current = event.currentTarget
    const candidates = getTabbableElements()
    const target = event.shiftKey
      ? [...candidates].reverse().find((element) =>
          Boolean(current.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_PRECEDING),
        )
      : candidates.find((element) =>
          Boolean(current.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING),
        )
    event.preventDefault()
    setOpen(false)
    focusOnOpenRef.current = null
    const fallback = target ?? triggerRef.current
    fallback?.focus()
  }

  const selectLanguage = (value: string) => {
    onUpdateLanguage(value)
    setLocale(value)
    close()
  }

  const handleTriggerClick = () => {
    if (isSubmitting) return
    if (open) {
      close()
      return
    }
    setOpen(true)
  }

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape" && open) {
      event.preventDefault()
      event.stopPropagation()
      close()
      return
    }
    if (event.key === "Tab" && open) {
      handleTab(event)
      return
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return
    event.preventDefault()
    const currentIndex = LANGUAGES.indexOf(language)
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? LANGUAGES.length - 1
        : event.key === "ArrowDown"
          ? Math.min(Math.max(currentIndex, 0) + 1, LANGUAGES.length - 1)
          : Math.max(Math.max(currentIndex, 0) - 1, 0)
    const nextLanguage = LANGUAGES[nextIndex]
    focusOnOpenRef.current = nextLanguage
    setOpen(true)
    focusAfterRender(nextLanguage)
  }

  const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, value: string) => {
    if (event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      close()
      return
    }
    if (event.key === "Tab") {
      handleTab(event)
      return
    }
    if (event.key === "Enter" || event.key === " " || event.code === "Space") {
      event.preventDefault()
      selectLanguage(value)
      return
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return
    event.preventDefault()
    const currentIndex = LANGUAGES.indexOf(value)
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? LANGUAGES.length - 1
        : event.key === "ArrowDown"
          ? (currentIndex + 1) % LANGUAGES.length
          : (currentIndex - 1 + LANGUAGES.length) % LANGUAGES.length
    focusLanguage(LANGUAGES[nextIndex])
  }

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        focusOnOpenRef.current = null
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  React.useEffect(() => {
    if (!open) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      close()
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [open, close])

  React.useEffect(() => {
    if (!open) return
    const value = focusOnOpenRef.current || language || LANGUAGES[0]
    focusOnOpenRef.current = null
    focusAfterRender(value)
  }, [open, language, focusAfterRender])

  const selected = language
  const selectedLanguageLabel = selected ? langLabel(selected) : t("auth.profile.selectLanguage")
  const triggerLabel = `${t("auth.profile.selectLanguage")}: ${selectedLanguageLabel}`

  return (
    <div className={`flex flex-col items-center min-h-[500px] pt-48 transition-all duration-300 ${open ? "-translate-y-40" : ""}`}>

      {/* Welcome aboard */}
      <p className="text-sm text-muted-foreground font-heading tracking-wider mb-3">
        {t("auth.profile.welcome")}
      </p>

      {/* Name */}
      <p className="font-heading text-4xl sm:text-5xl font-black tracking-tight text-center leading-none select-none pointer-events-none mb-14">
        {displayName}
      </p>

      {/* Language — custom dropdown */}
      <div className="flex flex-col items-center gap-3">
        <label id={labelId} htmlFor={triggerId} className="text-2xs text-muted-foreground uppercase tracking-[0.2em] font-medium">
          {t("auth.profile.language")}
        </label>
        <div ref={ref} className="relative w-56">
          <button
            id={triggerId}
            ref={triggerRef}
            type="button"
            onClick={handleTriggerClick}
            onKeyDown={handleTriggerKeyDown}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={open ? listboxId : undefined}
            aria-label={triggerLabel}
            disabled={isSubmitting}
            className="w-full flex items-center justify-between bg-white/10 hover:bg-white/[0.14] border border-white/25 text-sm text-foreground py-3 px-4 rounded-xl focus:outline-none focus:border-white/40 transition-all"
          >
            <span className={selected ? "text-foreground" : "text-muted-foreground/50"}>
              {selected ? langLabel(selected) : t("auth.profile.selectLanguage")}
            </span>
            <svg aria-hidden="true" className={`w-4 h-4 text-muted-foreground/60 transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {open && (
            <div id={listboxId} role="listbox" aria-labelledby={labelId} className="absolute z-50 top-full mt-1.5 left-0 right-0 max-h-48 overflow-y-auto rounded-xl border border-white/20 bg-[rgb(var(--background))]">
              {LANGUAGES.map((code) => (
                <button
                  key={code}
                  ref={(node) => {
                    optionRefs.current[code] = node
                  }}
                  id={`${listboxId}-${code}`}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  aria-selected={code === language}
                  onClick={() => selectLanguage(code)}
                  onKeyDown={(event) => handleOptionKeyDown(event, code)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/10 ${
                    code === language ? "text-foreground font-medium" : "text-muted-foreground"
                  }`}
                >
                  {langLabel(code)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Continue */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={isSubmitting}
        className="text-sm font-heading font-medium tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
      >
        {isSubmitting ? t("auth.profile.settingUp") : t("auth.profile.continue")}
      </button>
    </div>
  )
}
