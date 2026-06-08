"use client"

import { createContext, useContext, useState, ReactNode } from "react"

export type Engine = "next-unity" | "tanstack-unity" | "r3f" | "phaser" | "memory" | "no-game"
export type Game = "none" | "bubble-pop" | "wheel-of-fortune" | "scratch-card"

export interface PageBlock {
  id: string
  name: string
  key: string
  description: string
  enabled: boolean
}

export interface Page {
  id: string
  name: string
  route: string
  description: string
  icon: string
  blocks: PageBlock[]
  nextPage?: string
}

export interface WizardState {
  step: number
  engine: Engine | null
  projectName: string
  market: string
  timezone: string
  brand: string
  department: string
  languages: string[]
  defaultLanguage: string
  pages: Page[]
  game: Game
  capeMode: "create" | "existing"
  capeEmail: string
  capePassword: string
  campaignTitle: string
}

interface WizardContextType {
  state: WizardState
  setStep: (step: number) => void
  setEngine: (engine: Engine) => void
  updateProject: (updates: Partial<WizardState>) => void
  updatePages: (pages: Page[]) => void
  togglePageBlock: (pageId: string, blockId: string) => void
  reorderBlock: (pageId: string, blockId: string, direction: "up" | "down") => void
  setGame: (game: Game) => void
  canProceed: () => boolean
}

const defaultPages: Page[] = [
  {
    id: "loading",
    name: "Loading",
    route: "/loading",
    description: "Pre-entry loading screen with brand and progress",
    icon: "loader",
    blocks: [
      { id: "bg", name: "Background", key: "background", description: "Full-bleed background - image, solid color, or gradient", enabled: true },
      { id: "brand", name: "Brand chip", key: "brand-chip", description: "Small or medium top-center brand/sponsor logo", enabled: true },
      { id: "progress", name: "Progress indicator", key: "progress", description: "Loading bar or spinner animation", enabled: true },
    ],
    nextPage: "landing",
  },
  {
    id: "landing",
    name: "Landing",
    route: "/landing",
    description: "Hero / brand splash with CTA",
    icon: "home",
    blocks: [
      { id: "bg", name: "Background", key: "background", description: "Full-bleed background - image, solid color, or gradient", enabled: true },
      { id: "header", name: "Header chrome", key: "header-chrome", description: "Top-of-page slots: left + right corner controls", enabled: true },
      { id: "brand", name: "Brand chip", key: "brand-chip", description: "Small or medium top-center brand/sponsor logo", enabled: true },
      { id: "title", name: "Title block", key: "title-block", description: "Headline with optional kicker and subtitle", enabled: true },
      { id: "cta", name: "CTA group", key: "cta-group", description: "1-4 stacked buttons. Edit each button style and destination", enabled: true },
      { id: "footer", name: "Footer link list", key: "footer-link-list", description: "Bottom row of legal/supporting links", enabled: false },
    ],
    nextPage: "tutorial",
  },
  {
    id: "tutorial",
    name: "Tutorial",
    route: "/tutorial",
    description: "How-to-play steps / slides before gameplay",
    icon: "book-open",
    blocks: [
      { id: "bg", name: "Background", key: "background", description: "Full-bleed background - image, solid color, or gradient", enabled: true },
      { id: "steps", name: "Step slides", key: "step-slides", description: "Swipeable tutorial cards with illustrations", enabled: true },
      { id: "skip", name: "Skip button", key: "skip-button", description: "Allow users to skip the tutorial", enabled: true },
      { id: "progress", name: "Progress dots", key: "progress-dots", description: "Visual indicator of current slide", enabled: true },
    ],
    nextPage: "loading-video",
  },
  {
    id: "loading-video",
    name: "Loading video",
    route: "/loading-video",
    description: "Looping loading screen until the game is ready",
    icon: "video",
    blocks: [
      { id: "video", name: "Video player", key: "video-player", description: "Looping background video or animation", enabled: true },
      { id: "progress", name: "Progress overlay", key: "progress-overlay", description: "Loading percentage or spinner", enabled: true },
    ],
    nextPage: "game",
  },
  {
    id: "game",
    name: "Game",
    route: "/gameplay",
    description: "The actual game canvas",
    icon: "gamepad-2",
    blocks: [
      { id: "canvas", name: "Game canvas", key: "game-canvas", description: "Main game rendering area", enabled: true },
      { id: "hud", name: "HUD overlay", key: "hud-overlay", description: "Score, timer, and game controls", enabled: true },
      { id: "pause", name: "Pause menu", key: "pause-menu", description: "In-game pause overlay", enabled: true },
    ],
    nextPage: "result",
  },
  {
    id: "result",
    name: "Result",
    route: "/result",
    description: "Score screen and outcome display",
    icon: "trophy",
    blocks: [
      { id: "bg", name: "Background", key: "background", description: "Full-bleed background - image, solid color, or gradient", enabled: true },
      { id: "score", name: "Score display", key: "score-display", description: "Final score with animations", enabled: true },
      { id: "share", name: "Share buttons", key: "share-buttons", description: "Social sharing options", enabled: true },
      { id: "cta", name: "CTA group", key: "cta-group", description: "Next steps - register, play again, etc.", enabled: true },
    ],
    nextPage: "register",
  },
  {
    id: "register",
    name: "Register",
    route: "/register",
    description: "User registration form",
    icon: "user-plus",
    blocks: [
      { id: "bg", name: "Background", key: "background", description: "Full-bleed background - image, solid color, or gradient", enabled: true },
      { id: "form", name: "Registration form", key: "registration-form", description: "Name, email, and custom fields", enabled: true },
      { id: "consent", name: "Consent checkboxes", key: "consent-checkboxes", description: "GDPR and marketing opt-ins", enabled: true },
    ],
    nextPage: "voucher",
  },
  {
    id: "voucher",
    name: "Voucher",
    route: "/voucher",
    description: "Prize or voucher code display",
    icon: "ticket",
    blocks: [
      { id: "bg", name: "Background", key: "background", description: "Full-bleed background - image, solid color, or gradient", enabled: true },
      { id: "code", name: "Voucher code", key: "voucher-code", description: "Copyable code with barcode/QR option", enabled: true },
      { id: "instructions", name: "Instructions", key: "instructions", description: "How to redeem the voucher", enabled: true },
    ],
    nextPage: "leaderboard",
  },
  {
    id: "leaderboard",
    name: "Leaderboard",
    route: "/leaderboard",
    description: "High scores and rankings",
    icon: "list-ordered",
    blocks: [
      { id: "bg", name: "Background", key: "background", description: "Full-bleed background - image, solid color, or gradient", enabled: true },
      { id: "list", name: "Score list", key: "score-list", description: "Ranked list of players and scores", enabled: true },
      { id: "player", name: "Current player", key: "current-player", description: "Highlighted position of current user", enabled: true },
    ],
    nextPage: "menu",
  },
  {
    id: "menu",
    name: "Menu",
    route: "/menu",
    description: "Navigation menu overlay",
    icon: "menu",
    blocks: [
      { id: "nav", name: "Navigation links", key: "nav-links", description: "Links to all accessible pages", enabled: true },
      { id: "social", name: "Social links", key: "social-links", description: "External social media links", enabled: false },
    ],
  },
]

const defaultState: WizardState = {
  step: 1,
  engine: null,
  projectName: "",
  market: "NL",
  timezone: "Europe/Brussels",
  brand: "",
  department: "",
  languages: ["EN"],
  defaultLanguage: "EN",
  pages: defaultPages,
  game: "none",
  capeMode: "create",
  capeEmail: "",
  capePassword: "",
  campaignTitle: "",
}

const WizardContext = createContext<WizardContextType | undefined>(undefined)

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WizardState>(defaultState)

  const setStep = (step: number) => {
    setState((prev) => ({ ...prev, step }))
  }

  const setEngine = (engine: Engine) => {
    setState((prev) => ({ ...prev, engine }))
  }

  const updateProject = (updates: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...updates }))
  }

  const updatePages = (pages: Page[]) => {
    setState((prev) => ({ ...prev, pages }))
  }

  const togglePageBlock = (pageId: string, blockId: string) => {
    setState((prev) => ({
      ...prev,
      pages: prev.pages.map((page) =>
        page.id === pageId
          ? {
              ...page,
              blocks: page.blocks.map((block) =>
                block.id === blockId ? { ...block, enabled: !block.enabled } : block
              ),
            }
          : page
      ),
    }))
  }

  const reorderBlock = (pageId: string, blockId: string, direction: "up" | "down") => {
    setState((prev) => ({
      ...prev,
      pages: prev.pages.map((page) => {
        if (page.id !== pageId) return page
        const blocks = [...page.blocks]
        const index = blocks.findIndex((b) => b.id === blockId)
        if (index === -1) return page
        const newIndex = direction === "up" ? index - 1 : index + 1
        if (newIndex < 0 || newIndex >= blocks.length) return page
        ;[blocks[index], blocks[newIndex]] = [blocks[newIndex], blocks[index]]
        return { ...page, blocks }
      }),
    }))
  }

  const setGame = (game: Game) => {
    setState((prev) => ({ ...prev, game }))
  }

  const canProceed = (): boolean => {
    switch (state.step) {
      case 1:
        return state.engine !== null
      case 2:
        return state.projectName.trim().length > 0
      case 3:
        return state.pages.length > 0
      case 4:
        return true
      case 5:
        return state.capeMode === "existing" || state.capeEmail.length > 0
      case 6:
        return true
      default:
        return false
    }
  }

  return (
    <WizardContext.Provider
      value={{
        state,
        setStep,
        setEngine,
        updateProject,
        updatePages,
        togglePageBlock,
        reorderBlock,
        setGame,
        canProceed,
      }}
    >
      {children}
    </WizardContext.Provider>
  )
}

export function useWizard() {
  const context = useContext(WizardContext)
  if (!context) {
    throw new Error("useWizard must be used within WizardProvider")
  }
  return context
}
