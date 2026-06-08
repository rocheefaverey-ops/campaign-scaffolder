"use client"

import { cn } from "@/lib/utils"
import { useWizard, Engine } from "./wizard-context"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Info, Box, Gamepad2, Monitor, Puzzle, Layers } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface EngineOption {
  id: Engine
  name: string
  description: string
  badge?: string
  icon: React.ReactNode
}

const engines: EngineOption[] = [
  {
    id: "next-unity",
    name: "Next.js + Unity",
    description: "Next.js 16 + Unity WebGL — like HaasF1",
    icon: <Layers className="h-5 w-5" />,
  },
  {
    id: "tanstack-unity",
    name: "TanStack + Unity",
    description: "TanStack Start + Unity WebGL — like NHL-Crush",
    icon: <Layers className="h-5 w-5" />,
  },
  {
    id: "r3f",
    name: "React Three Fiber",
    description: "3D in-browser — R3F / ThreeJS",
    badge: "Popular",
    icon: <Box className="h-5 w-5" />,
  },
  {
    id: "phaser",
    name: "Phaser 3",
    description: "2D game engine — like Freekick",
    icon: <Gamepad2 className="h-5 w-5" />,
  },
  {
    id: "memory",
    name: "Memory (no engine)",
    description: "Pure React — like Hunkemöller memory",
    icon: <Puzzle className="h-5 w-5" />,
  },
  {
    id: "no-game",
    name: "No game",
    description: "CAPE only — registration / voucher flows",
    icon: <Monitor className="h-5 w-5" />,
  },
]

export function StepEngine() {
  const { state, setEngine } = useWizard()

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Engine</h1>
          <p className="mt-1.5 text-muted-foreground">
            Pick the runtime engine and base stack. You can change modules later.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {engines.map((engine) => (
            <Card
              key={engine.id}
              className={cn(
                "cursor-pointer border-2 transition-all hover:border-primary/50",
                state.engine === engine.id
                  ? "border-primary bg-primary/5"
                  : "border-transparent bg-card hover:bg-card/80"
              )}
              onClick={() => setEngine(engine.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                        state.engine === engine.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {engine.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">
                          {engine.name}
                        </h3>
                        {engine.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {engine.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {engine.description}
                      </p>
                    </div>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p className="max-w-[200px] text-xs">
                        View documentation and examples for {engine.name}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </TooltipProvider>
  )
}
