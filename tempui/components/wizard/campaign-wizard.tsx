"use client"

import { WizardProvider, useWizard } from "./wizard-context"
import { WizardHeader, WizardFooter } from "./wizard-navigation"
import { StepEngine } from "./step-engine"
import { StepProject } from "./step-project"
import { StepPages } from "./step-pages"
import { StepGame } from "./step-game"
import { StepCape } from "./step-cape"
import { StepBuild } from "./step-build"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { useState } from "react"

function WizardContent() {
  const { state } = useWizard()
  const [showBanner, setShowBanner] = useState(true)

  return (
    <div className="min-h-screen bg-background">
      <WizardHeader />
      
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Resume banner */}
        {showBanner && (
          <div className="mb-8 flex items-center justify-between rounded-lg border border-border/50 bg-card px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Resumed your previous wizard progress. Use{" "}
              <span className="font-medium text-foreground">Start fresh</span> in
              the header to discard it.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBanner(false)}
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Step content */}
        {state.step === 1 && <StepEngine />}
        {state.step === 2 && <StepProject />}
        {state.step === 3 && <StepPages />}
        {state.step === 4 && <StepGame />}
        {state.step === 5 && <StepCape />}
        {state.step === 6 && <StepBuild />}
      </main>

      <WizardFooter />
    </div>
  )
}

export function CampaignWizard() {
  return (
    <TooltipProvider>
      <WizardProvider>
        <WizardContent />
      </WizardProvider>
    </TooltipProvider>
  )
}
