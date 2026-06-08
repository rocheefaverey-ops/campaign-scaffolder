"use client"

import { useWizard } from "./wizard-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  CheckCircle2,
  RefreshCw,
  Rocket,
  Square,
} from "lucide-react"
import { cn } from "@/lib/utils"

const engineLabels: Record<string, string> = {
  "next-unity": "next / unity",
  "tanstack-unity": "tanstack / unity",
  r3f: "next / r3f",
  phaser: "next / phaser",
  memory: "next / react",
  "no-game": "next / cape-only",
}

const moduleList = ["leaderboard", "registration", "scoring", "video", "voucher"]

export function StepBuild() {
  const { state } = useWizard()

  const projectTitle = state.projectName
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")

  return (
    <div className="mx-auto max-w-5xl pb-24">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Review & build</h1>
        <p className="mt-1.5 text-muted-foreground">
          The wizard will run{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            scaffold.js --config=...
          </code>{" "}
          with the values below.
        </p>
      </div>

      {/* Build plan card */}
      <Card className="mb-6 border-border/50 bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Build Plan
            </p>
            <CardTitle className="mt-1 text-xl">
              {state.projectName || "next-r3f-scaf-v2"}
            </CardTitle>
          </div>
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
            <Rocket className="mr-1.5 h-3 w-3" />
            FRESH SCAFFOLD
          </Badge>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Summary row */}
          <div className="grid grid-cols-4 gap-4 rounded-lg border border-border/50 bg-muted/30 p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Output
              </p>
              <p className="mt-1 text-sm text-foreground">Sibling of scaffolder</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Stack
              </p>
              <p className="mt-1 font-mono text-sm text-foreground">
                {engineLabels[state.engine || "r3f"]}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                CAPE
              </p>
              <p className="mt-1 text-sm text-foreground">
                {state.capeMode === "create" ? "Create new" : "Use existing"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Market
              </p>
              <p className="mt-1 text-sm text-foreground">
                {state.market} / {state.timezone}
              </p>
            </div>
          </div>

          {/* Details grid */}
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Campaign details */}
            <div className="rounded-lg border border-border/50 p-4">
              <h3 className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Campaign
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Brand</span>
                  <span className="text-foreground">
                    {state.brand || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Department</span>
                  <span className="text-foreground">
                    {state.department || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Game Config</span>
                  <span className="text-foreground">
                    {state.game === "none" ? "r3f defaults" : state.game}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entry Route</span>
                  <span className="font-mono text-foreground">/loading</span>
                </div>
              </div>
            </div>

            {/* Pages list */}
            <div className="rounded-lg border border-border/50 p-4">
              <h3 className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Pages ({state.pages.length})
              </h3>
              <div className="space-y-2">
                {state.pages.map((page, idx) => (
                  <div key={page.id} className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium",
                        idx < 5
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {idx + 1}
                    </div>
                    <span className="font-medium text-foreground">
                      {page.name}
                    </span>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {page.route}
                    </code>
                  </div>
                ))}
              </div>
            </div>

            {/* Modules */}
            <div className="rounded-lg border border-border/50 p-4">
              <h3 className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Modules ({moduleList.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {moduleList.map((mod) => (
                  <Badge key={mod} variant="secondary">
                    {mod}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Runtime config */}
            <div className="rounded-lg border border-border/50 p-4">
              <h3 className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Runtime
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Registration</span>
                  <span className="text-foreground">After gameplay</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">iFrame</span>
                  <span className="text-foreground">disabled</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GTM</span>
                  <span className="text-foreground">not configured</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Languages</span>
                  <span className="text-foreground">
                    {state.defaultLanguage} default
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Doctor status */}
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <div>
              <span className="font-medium text-primary">Doctor</span>
              <span className="ml-2 text-sm text-muted-foreground">
                Everything needed for build looks healthy.
              </span>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </CardContent>
      </Card>

      {/* Run after build option */}
      <div className="mb-6 flex items-center gap-3">
        <Square className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            Run it for me after build
          </span>{" "}
          — spawn{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">pnpm</code>{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">dev</code> on
          the scaffolded project and open it in a new tab.
        </span>
      </div>

      {/* Build button */}
      <Button size="lg" className="gap-2 px-8">
        <Rocket className="h-4 w-4" />
        Start build
      </Button>
    </div>
  )
}
