"use client"

import { cn } from "@/lib/utils"
import { useWizard, Game } from "./wizard-context"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Box, Sparkles, Target, Gift } from "lucide-react"

interface GameOption {
  id: Game
  name: string
  description: string
  badge?: string
  icon: React.ReactNode
}

const games: GameOption[] = [
  {
    id: "none",
    name: "No specific game",
    description: "Use r3f engine settings only",
    icon: <Box className="h-5 w-5" />,
  },
  {
    id: "bubble-pop",
    name: "Bubble Pop",
    description: "3D bubble popping game built with React Three Fiber.",
    badge: "R3F",
    icon: <Sparkles className="h-5 w-5" />,
  },
  {
    id: "wheel-of-fortune",
    name: "Wheel of Fortune",
    description: "Spin-to-win prize wheel with customizable segments.",
    badge: "R3F",
    icon: <Target className="h-5 w-5" />,
  },
  {
    id: "scratch-card",
    name: "Scratch Card",
    description: "Reveal-to-win scratch card with canvas interaction.",
    badge: "Canvas",
    icon: <Gift className="h-5 w-5" />,
  },
]

export function StepGame() {
  const { state, setGame } = useWizard()

  return (
    <div className="mx-auto max-w-4xl pb-24">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Game</h1>
        <p className="mt-1.5 text-muted-foreground">
          Select a pre-built game definition from{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            games/*/game.json
          </code>
          . Leave empty to use the r3f engine without game-specific defaults.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {games.map((game) => (
          <Card
            key={game.id}
            className={cn(
              "cursor-pointer border-2 transition-all hover:border-primary/50",
              state.game === game.id
                ? "border-primary bg-primary/5"
                : "border-transparent bg-card hover:bg-card/80"
            )}
            onClick={() => setGame(game.id)}
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                    state.game === game.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {game.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{game.name}</h3>
                    {game.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {game.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {game.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
