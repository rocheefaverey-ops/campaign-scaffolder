"use client"

import { cn } from "@/lib/utils"
import { useWizard } from "./wizard-context"
import { Button } from "@/components/ui/button"
import {
  FolderOpen,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react"

const steps = [
  { id: 1, label: "Stack" },
  { id: 2, label: "Project" },
  { id: 3, label: "Pages" },
  { id: 4, label: "Game" },
  { id: 5, label: "CAPE" },
  { id: 6, label: "Build" },
]

export function WizardHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">Livewall Campaign Wizard</span>
          </div>
          <span className="text-sm text-muted-foreground">scaffold a new campaign</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <FolderOpen className="h-3.5 w-3.5" />
            Open existing
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Start fresh
          </Button>
          <div className="ml-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            CAPE: SIGNED OUT
          </div>
        </div>
      </div>
    </header>
  )
}

export function WizardProgress() {
  const { state } = useWizard()

  return (
    <div className="flex items-center justify-center gap-2 py-6">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-all",
                state.step === step.id
                  ? "bg-primary text-primary-foreground"
                  : state.step > step.id
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {step.id}
            </div>
            <span
              className={cn(
                "text-sm transition-colors",
                state.step === step.id
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                "h-px w-8 transition-colors",
                state.step > step.id ? "bg-primary/40" : "bg-border"
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export function WizardFooter() {
  const { state, setStep, canProceed } = useWizard()

  return (
    <footer className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Button
          variant="outline"
          onClick={() => setStep(Math.max(1, state.step - 1))}
          disabled={state.step === 1}
          className="gap-1.5"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>

        <WizardProgress />

        <Button
          onClick={() => setStep(Math.min(6, state.step + 1))}
          disabled={!canProceed() || state.step === 6}
          className="gap-1.5"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </footer>
  )
}
