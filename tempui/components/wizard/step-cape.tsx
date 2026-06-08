"use client"

import { cn } from "@/lib/utils"
import { useWizard } from "./wizard-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sparkles, Link2 } from "lucide-react"

export function StepCape() {
  const { state, updateProject } = useWizard()

  return (
    <div className="mx-auto max-w-4xl pb-24">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">CAPE campaign</h1>
        <p className="mt-1.5 text-muted-foreground">
          By default we&apos;ll create a fresh CAPE campaign for this project,
          push the format, and publish it to acceptance — all hands-free. Need to
          bind to an existing campaign instead? Switch the option below.
        </p>
      </div>

      {/* Mode selection */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card
          className={cn(
            "cursor-pointer border-2 transition-all hover:border-primary/50",
            state.capeMode === "create"
              ? "border-primary bg-primary/5"
              : "border-transparent bg-card hover:bg-card/80"
          )}
          onClick={() => updateProject({ capeMode: "create" })}
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                  state.capeMode === "create"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  Create a new CAPE campaign
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Recommended. Uses your CAPE login.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer border-2 transition-all hover:border-primary/50",
            state.capeMode === "existing"
              ? "border-primary bg-primary/5"
              : "border-transparent bg-card hover:bg-card/80"
          )}
          onClick={() => updateProject({ capeMode: "existing" })}
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                  state.capeMode === "existing"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Link2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  Use existing campaign
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Bind to a CAPE campaign you&apos;ve already created.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign title */}
      <Card className="mb-6 border-border/50 bg-card">
        <CardContent className="space-y-4 p-6">
          <div className="space-y-2">
            <Label
              htmlFor="campaignTitle"
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Campaign Title (Optional)
            </Label>
            <Input
              id="campaignTitle"
              value={state.campaignTitle}
              onChange={(e) => updateProject({ campaignTitle: e.target.value })}
              placeholder={state.projectName || "Next R3f Scaf V2"}
              className="bg-background"
            />
            <p className="text-sm text-muted-foreground">
              Will create a CAPE campaign titled{" "}
              <span className="font-medium text-foreground">
                {state.campaignTitle ||
                  state.projectName
                    .split("-")
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(" ") ||
                  "Next R3f Scaf V2"}
              </span>
              .
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Login form */}
      <Card className="border-border/50 bg-card">
        <CardContent className="space-y-4 p-6">
          <div>
            <h3 className="font-semibold text-foreground">Log in to CAPE</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Same credentials you use for the CAPE web UI. Tokens are cached so
              you only do this once per machine.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label
                htmlFor="capeEmail"
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                Email
              </Label>
              <Input
                id="capeEmail"
                type="email"
                value={state.capeEmail}
                onChange={(e) => updateProject({ capeEmail: e.target.value })}
                placeholder="you@livewallgroup.com"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="capePassword"
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                Password
              </Label>
              <Input
                id="capePassword"
                type="password"
                value={state.capePassword}
                onChange={(e) => updateProject({ capePassword: e.target.value })}
                placeholder="••••••••••••••••"
                className="bg-background"
              />
            </div>
          </div>

          <Button className="w-auto">Log In</Button>
        </CardContent>
      </Card>
    </div>
  )
}
