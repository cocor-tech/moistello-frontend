"use client"

import { logger } from "@/lib/logger"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { ArrowLeft, Save, Check, Trash2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useTranslate } from "@/lib/locale/context"
import { Button, ButtonLink } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { patch, del } from "@/lib/api-client"

const COUNTRIES = [
  { value: "AF", label: "Afghanistan" }, { value: "AL", label: "Albania" }, { value: "DZ", label: "Algeria" },
  { value: "AD", label: "Andorra" }, { value: "AO", label: "Angola" }, { value: "AG", label: "Antigua & Barbuda" },
  { value: "AR", label: "Argentina" }, { value: "AM", label: "Armenia" }, { value: "AU", label: "Australia" },
  { value: "AT", label: "Austria" }, { value: "AZ", label: "Azerbaijan" }, { value: "BS", label: "Bahamas" },
  { value: "BH", label: "Bahrain" }, { value: "BD", label: "Bangladesh" }, { value: "BB", label: "Barbados" },
  { value: "BY", label: "Belarus" }, { value: "BE", label: "Belgium" }, { value: "BZ", label: "Belize" },
  { value: "BJ", label: "Benin" }, { value: "BT", label: "Bhutan" }, { value: "BO", label: "Bolivia" },
  { value: "BA", label: "Bosnia & Herzegovina" }, { value: "BW", label: "Botswana" }, { value: "BR", label: "Brazil" },
  { value: "BN", label: "Brunei" }, { value: "BG", label: "Bulgaria" }, { value: "BF", label: "Burkina Faso" },
  { value: "BI", label: "Burundi" }, { value: "KH", label: "Cambodia" }, { value: "CM", label: "Cameroon" },
  { value: "CA", label: "Canada" }, { value: "CV", label: "Cape Verde" }, { value: "CF", label: "Central African Republic" },
  { value: "TD", label: "Chad" }, { value: "CL", label: "Chile" }, { value: "CN", label: "China" },
  { value: "CO", label: "Colombia" }, { value: "KM", label: "Comoros" }, { value: "CG", label: "Congo" },
  { value: "CD", label: "Congo (DRC)" }, { value: "CR", label: "Costa Rica" }, { value: "HR", label: "Croatia" },
  { value: "CU", label: "Cuba" }, { value: "CY", label: "Cyprus" }, { value: "CZ", label: "Czech Republic" },
  { value: "DK", label: "Denmark" }, { value: "DJ", label: "Djibouti" }, { value: "DM", label: "Dominica" },
  { value: "DO", label: "Dominican Republic" }, { value: "EC", label: "Ecuador" }, { value: "EG", label: "Egypt" },
  { value: "SV", label: "El Salvador" }, { value: "GQ", label: "Equatorial Guinea" }, { value: "ER", label: "Eritrea" },
  { value: "EE", label: "Estonia" }, { value: "SZ", label: "Eswatini" }, { value: "ET", label: "Ethiopia" },
  { value: "FJ", label: "Fiji" }, { value: "FI", label: "Finland" }, { value: "FR", label: "France" },
  { value: "GA", label: "Gabon" }, { value: "GM", label: "Gambia" }, { value: "GE", label: "Georgia" },
  { value: "DE", label: "Germany" }, { value: "GH", label: "Ghana" }, { value: "GR", label: "Greece" },
  { value: "GD", label: "Grenada" }, { value: "GT", label: "Guatemala" }, { value: "GN", label: "Guinea" },
  { value: "GW", label: "Guinea-Bissau" }, { value: "GY", label: "Guyana" }, { value: "HT", label: "Haiti" },
  { value: "HN", label: "Honduras" }, { value: "HU", label: "Hungary" }, { value: "IS", label: "Iceland" },
  { value: "IN", label: "India" }, { value: "ID", label: "Indonesia" }, { value: "IR", label: "Iran" },
  { value: "IQ", label: "Iraq" }, { value: "IE", label: "Ireland" }, { value: "IL", label: "Israel" },
  { value: "IT", label: "Italy" }, { value: "CI", label: "Ivory Coast" }, { value: "JM", label: "Jamaica" },
  { value: "JP", label: "Japan" }, { value: "JO", label: "Jordan" }, { value: "KZ", label: "Kazakhstan" },
  { value: "KE", label: "Kenya" }, { value: "KI", label: "Kiribati" }, { value: "KW", label: "Kuwait" },
  { value: "KG", label: "Kyrgyzstan" }, { value: "LA", label: "Laos" }, { value: "LV", label: "Latvia" },
  { value: "LB", label: "Lebanon" }, { value: "LS", label: "Lesotho" }, { value: "LR", label: "Liberia" },
  { value: "LY", label: "Libya" }, { value: "LI", label: "Liechtenstein" }, { value: "LT", label: "Lithuania" },
  { value: "LU", label: "Luxembourg" }, { value: "MG", label: "Madagascar" }, { value: "MW", label: "Malawi" },
  { value: "MY", label: "Malaysia" }, { value: "MV", label: "Maldives" }, { value: "ML", label: "Mali" },
  { value: "MT", label: "Malta" }, { value: "MH", label: "Marshall Islands" }, { value: "MR", label: "Mauritania" },
  { value: "MU", label: "Mauritius" }, { value: "MX", label: "Mexico" }, { value: "FM", label: "Micronesia" },
  { value: "MD", label: "Moldova" }, { value: "MC", label: "Monaco" }, { value: "MN", label: "Mongolia" },
  { value: "ME", label: "Montenegro" }, { value: "MA", label: "Morocco" }, { value: "MZ", label: "Mozambique" },
  { value: "MM", label: "Myanmar" }, { value: "NA", label: "Namibia" }, { value: "NR", label: "Nauru" },
  { value: "NP", label: "Nepal" }, { value: "NL", label: "Netherlands" }, { value: "NZ", label: "New Zealand" },
  { value: "NI", label: "Nicaragua" }, { value: "NE", label: "Niger" }, { value: "NG", label: "Nigeria" },
  { value: "KP", label: "North Korea" }, { value: "MK", label: "North Macedonia" }, { value: "NO", label: "Norway" },
  { value: "OM", label: "Oman" }, { value: "PK", label: "Pakistan" }, { value: "PW", label: "Palau" },
  { value: "PS", label: "Palestine" }, { value: "PA", label: "Panama" }, { value: "PG", label: "Papua New Guinea" },
  { value: "PY", label: "Paraguay" }, { value: "PE", label: "Peru" }, { value: "PH", label: "Philippines" },
  { value: "PL", label: "Poland" }, { value: "PT", label: "Portugal" }, { value: "QA", label: "Qatar" },
  { value: "RO", label: "Romania" }, { value: "RU", label: "Russia" }, { value: "RW", label: "Rwanda" },
  { value: "KN", label: "Saint Kitts & Nevis" }, { value: "LC", label: "Saint Lucia" }, { value: "WS", label: "Samoa" },
  { value: "SM", label: "San Marino" }, { value: "ST", label: "Sao Tome & Principe" }, { value: "SA", label: "Saudi Arabia" },
  { value: "SN", label: "Senegal" }, { value: "RS", label: "Serbia" }, { value: "SC", label: "Seychelles" },
  { value: "SL", label: "Sierra Leone" }, { value: "SG", label: "Singapore" }, { value: "SK", label: "Slovakia" },
  { value: "SI", label: "Slovenia" }, { value: "SB", label: "Solomon Islands" }, { value: "SO", label: "Somalia" },
  { value: "ZA", label: "South Africa" }, { value: "KR", label: "South Korea" }, { value: "SS", label: "South Sudan" },
  { value: "ES", label: "Spain" }, { value: "LK", label: "Sri Lanka" }, { value: "SD", label: "Sudan" },
  { value: "SR", label: "Suriname" }, { value: "SE", label: "Sweden" }, { value: "CH", label: "Switzerland" },
  { value: "SY", label: "Syria" }, { value: "TW", label: "Taiwan" }, { value: "TJ", label: "Tajikistan" },
  { value: "TZ", label: "Tanzania" }, { value: "TH", label: "Thailand" }, { value: "TL", label: "Timor-Leste" },
  { value: "TG", label: "Togo" }, { value: "TO", label: "Tonga" }, { value: "TT", label: "Trinidad & Tobago" },
  { value: "TN", label: "Tunisia" }, { value: "TR", label: "Turkey" }, { value: "TM", label: "Turkmenistan" },
  { value: "TV", label: "Tuvalu" }, { value: "UG", label: "Uganda" }, { value: "UA", label: "Ukraine" },
  { value: "AE", label: "United Arab Emirates" }, { value: "GB", label: "United Kingdom" },
  { value: "US", label: "United States" }, { value: "UY", label: "Uruguay" }, { value: "UZ", label: "Uzbekistan" },
  { value: "VU", label: "Vanuatu" }, { value: "VA", label: "Vatican City" }, { value: "VE", label: "Venezuela" },
  { value: "VN", label: "Vietnam" }, { value: "YE", label: "Yemen" }, { value: "ZM", label: "Zambia" },
  { value: "ZW", label: "Zimbabwe" },
].sort((a, b) => a.label.localeCompare(b.label))

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

export default function AccountSettingsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { t, setLocale } = useTranslate()

  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [country, setCountry] = useState("")
  const [language, setLanguage] = useState("en")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    if (user) {
      setEmail(user.email ?? "")
      setPhone(user.phone ?? "")
      setCountry(user.countryCode ?? "")
      setLanguage(user.preferredLanguage ?? "en")
    }
  }, [user])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await patch("/users/me", {
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        countryCode: country || undefined,
        preferredLanguage: language || undefined,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      logger.error("[account] Failed to save account settings:", e)
    } finally {
      setSaving(false)
    }
  }, [email, phone, country, language])

  const handleDeleteAccount = useCallback(async () => {
    setDeleting(true)
    try {
      await del("/users/me")
      window.location.href = "/login"
    } catch (e) {
      logger.error("[account] Failed to delete account:", e)
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }, [])

  const handleLanguageChange = (code: string) => {
    setLanguage(code)
    setLocale(code)
  }

  const langOptions = LANGUAGES.map((code) => ({
    value: code,
    label: LANG_NAMES[code] ?? code,
  }))

  if (authLoading) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <div className="h-8 w-48 bg-white/5 rounded animate-pulse" />
        <div className="h-64 glass-premium rounded-2xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Back to settings">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">{t("account.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("account.desc")}</p>
        </div>
      </div>

      <div className="glass-premium rounded-2xl p-6 space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-heading tracking-wider uppercase text-muted-foreground">
            {t("account.displayName")}
          </label>
          <p className="font-heading text-lg font-semibold text-foreground">{user?.displayName || t("account.anonymous")}</p>
          <p className="text-2xs text-muted-foreground mt-1">{t("account.displayNameHint")}</p>
        </div>

        <Input
          label={t("account.email")}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("account.emailPlaceholder")}
          hint={t("account.emailHint")}
        />

        <Input
          label={t("account.phone")}
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t("account.phonePlaceholder")}
          hint={t("account.phoneHint")}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label={t("account.country")}
            options={COUNTRIES}
            value={country}
            onChange={setCountry}
            placeholder={t("account.selectCountry")}
          />
          <Select
            label={t("account.language")}
            options={langOptions}
            value={language}
            onChange={handleLanguageChange}
            placeholder={t("account.selectLanguage")}
          />
        </div>
      </div>

      {/* Delete Account */}
      <div className="rounded-2xl border border-red-500/15 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20">
            <Trash2 className="h-4 w-4 text-red-400" />
          </div>
          <h3 className="font-heading text-base font-semibold text-red-400">{t("account.deleteAccount")}</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("account.deleteAccountHint")}
        </p>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            {t("account.confirmDelete")}
          </label>
          <div className="flex gap-2">
            <Input
              label={t("account.confirmDelete")}
              placeholder={user?.displayName ?? t("account.displayName")}
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="destructive"
              size="md"
              onClick={() => setShowDeleteModal(true)}
              isLoading={deleting}
              disabled={deleteConfirm !== (user?.displayName ?? "")}
            >
              {t("account.deleteAccount")}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <ButtonLink href="/settings" variant="outline" size="md">{t("common.cancel")}</ButtonLink>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-400">
            <Check className="h-4 w-4" /> {t("common.saved")}
          </span>
        )}
        <Button variant="primary" size="md" onClick={handleSave} isLoading={saving} leftIcon={<Save className="h-4 w-4" />}>
          {t("common.saveChanges")}
        </Button>
      </div>

      <ConfirmDialog
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        title={t("account.deleteAccount")}
        message={t("account.deleteAccountHint")}
        confirmLabel={t("account.deleteMyAccount")}
        variant="danger"
        isLoading={deleting}
      />
    </div>
  )
}
