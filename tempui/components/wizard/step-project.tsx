"use client"

import { useWizard } from "./wizard-context"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Star } from "lucide-react"

const markets = [
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "UK", name: "United Kingdom" },
  { code: "US", name: "United States" },
]

const timezones = [
  "Europe/Brussels",
  "Europe/Amsterdam",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/London",
  "America/New_York",
]

interface LanguageRegion {
  name: string
  languages: { code: string; name: string }[]
}

const languageRegions: LanguageRegion[] = [
  {
    name: "Western Europe",
    languages: [
      { code: "EN", name: "English" },
      { code: "NL", name: "Nederlands" },
      { code: "NL-BE", name: "Vlaams (NL-BE)" },
      { code: "DE", name: "Deutsch" },
      { code: "DE-AT", name: "Österreichisch" },
      { code: "DE-CH", name: "Schweizerdeutsch" },
      { code: "FR", name: "Français" },
      { code: "FR-BE", name: "Français (BE)" },
      { code: "FR-CH", name: "Français (CH)" },
      { code: "IT", name: "Italiano" },
      { code: "ES", name: "Español" },
      { code: "PT", name: "Português" },
      { code: "PT-BR", name: "Português (BR)" },
      { code: "GA", name: "Gaeilge" },
    ],
  },
  {
    name: "Northern Europe",
    languages: [
      { code: "SV", name: "Svenska" },
      { code: "NO", name: "Norsk" },
      { code: "DA", name: "Dansk" },
      { code: "FI", name: "Suomi" },
      { code: "IS", name: "Íslenska" },
    ],
  },
  {
    name: "Central & Eastern Europe",
    languages: [
      { code: "PL", name: "Polski" },
      { code: "CS", name: "Čeština" },
      { code: "SK", name: "Slovenčina" },
      { code: "HU", name: "Magyar" },
      { code: "RO", name: "Română" },
      { code: "BG", name: "Български" },
      { code: "HR", name: "Hrvatski" },
      { code: "SR", name: "Српски" },
    ],
  },
]

export function StepProject() {
  const { state, updateProject } = useWizard()

  const toggleLanguage = (code: string) => {
    const languages = state.languages.includes(code)
      ? state.languages.filter((l) => l !== code)
      : [...state.languages, code]
    updateProject({ languages })
  }

  const setDefaultLanguage = (code: string) => {
    const languages = state.languages.includes(code)
      ? state.languages
      : [...state.languages, code]
    updateProject({ defaultLanguage: code, languages })
  }

  return (
    <div className="mx-auto max-w-4xl pb-24">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Project basics</h1>
        <p className="mt-1.5 text-muted-foreground">
          These get baked into the scaffolded files (folder name, env vars, CAPE binding).
        </p>
      </div>

      <div className="space-y-6">
        {/* Main form card */}
        <Card className="border-border/50 bg-card">
          <CardContent className="grid gap-6 p-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="projectName" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Project Name
              </Label>
              <Input
                id="projectName"
                value={state.projectName}
                onChange={(e) => updateProject({ projectName: e.target.value })}
                placeholder="next-r3f-scaf-v2"
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="market" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Market
              </Label>
              <Select
                value={state.market}
                onValueChange={(v) => updateProject({ market: v })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {markets.map((m) => (
                    <SelectItem key={m.code} value={m.code}>
                      {m.code} — {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Two-letter country code. Drives default language, GDPR copy, and CAPE locale.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Timezone
              </Label>
              <Select
                value={state.timezone}
                onValueChange={(v) => updateProject({ timezone: v })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Brand (Optional)
              </Label>
              <Input
                id="brand"
                value={state.brand}
                onChange={(e) => updateProject({ brand: e.target.value })}
                placeholder="e.g. Hema, Heineken, Proximus"
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Department (Optional)
              </Label>
              <Input
                id="department"
                value={state.department}
                onChange={(e) => updateProject({ department: e.target.value })}
                placeholder="e.g. Marketing, Loyalty"
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Output Folder (Optional)
              </Label>
              <Input
                placeholder="(default: sibling dir of scaffolder)"
                className="bg-background"
              />
              <p className="text-xs text-muted-foreground">
                Where to scaffold the project. Default ../{state.projectName || "project-name"} resolves to a sibling project folder.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Info banner */}
        <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            CAPE campaign setup runs during build. By default the wizard creates a fresh campaign, so no campaign ID is needed here.
          </p>
        </div>

        {/* Languages section */}
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Languages
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  The <span className="font-medium text-foreground">default</span> is the language the site loads in (used for{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">&lt;html lang&gt;</code> and{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">NEXT_PUBLIC_CAPE_LANGUAGE</code>). Click a language to toggle it as supported · click ⌘/★ to set the default · the default is always supported.
                </p>
              </div>
              <div className="text-right text-sm">
                <span className="text-muted-foreground">{state.languages.length} selected · default </span>
                <span className="font-mono text-primary">{state.defaultLanguage}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Selected languages */}
            {state.languages.length > 0 && (
              <div className="mb-6">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Selected
                </p>
                <div className="flex flex-wrap gap-2">
                  {state.languages.map((code) => {
                    const lang = languageRegions
                      .flatMap((r) => r.languages)
                      .find((l) => l.code === code)
                    return (
                      <button
                        key={code}
                        onClick={() => setDefaultLanguage(code)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all",
                          state.defaultLanguage === code
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-card text-foreground hover:border-primary/50"
                        )}
                      >
                        <span className="font-mono text-xs text-muted-foreground">
                          {code}
                        </span>
                        <span>{lang?.name || code}</span>
                        {state.defaultLanguage === code && (
                          <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Language regions */}
            <div className="space-y-6">
              {languageRegions.map((region) => (
                <div key={region.name}>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {region.name}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {region.languages.map((lang) => {
                      const isSelected = state.languages.includes(lang.code)
                      const isDefault = state.defaultLanguage === lang.code
                      return (
                        <button
                          key={lang.code}
                          onClick={() => toggleLanguage(lang.code)}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all",
                            isSelected
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                          )}
                        >
                          <span className="font-mono text-xs opacity-60">
                            {lang.code}
                          </span>
                          <span>{lang.name}</span>
                          {isDefault && (
                            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                          )}
                          {isSelected && !isDefault && (
                            <Star className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Filter input */}
            <div className="mt-6">
              <Input
                placeholder="Filter by code or name (e.g. NL, English, 中文)..."
                className="bg-background"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
