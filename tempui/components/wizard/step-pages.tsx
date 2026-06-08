"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { useWizard, Page } from "./wizard-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  X,
  Edit3,
  Play,
  Plus,
  Loader2,
  Home,
  BookOpen,
  Video,
  Gamepad2,
  Trophy,
  UserPlus,
  Ticket,
  ListOrdered,
  Menu,
  GripVertical,
  Smartphone,
} from "lucide-react"

function getPageIcon(iconName: string) {
  const icons: Record<string, React.ReactNode> = {
    loader: <Loader2 className="h-4 w-4" />,
    home: <Home className="h-4 w-4" />,
    "book-open": <BookOpen className="h-4 w-4" />,
    video: <Video className="h-4 w-4" />,
    "gamepad-2": <Gamepad2 className="h-4 w-4" />,
    trophy: <Trophy className="h-4 w-4" />,
    "user-plus": <UserPlus className="h-4 w-4" />,
    ticket: <Ticket className="h-4 w-4" />,
    "list-ordered": <ListOrdered className="h-4 w-4" />,
    menu: <Menu className="h-4 w-4" />,
  }
  return icons[iconName] || <Home className="h-4 w-4" />
}

export function StepPages() {
  const { state, togglePageBlock, reorderBlock } = useWizard()
  const [view, setView] = useState<"flow" | "edit">("flow")
  const [editingPage, setEditingPage] = useState<Page | null>(null)
  const [previewPage, setPreviewPage] = useState<string>("loading")

  const currentPreviewPage = state.pages.find((p) => p.id === previewPage)

  if (view === "edit" && editingPage) {
    return (
      <PageEditor
        page={editingPage}
        onBack={() => {
          setView("flow")
          setEditingPage(null)
        }}
        toggleBlock={(blockId) => togglePageBlock(editingPage.id, blockId)}
        reorderBlock={(blockId, dir) =>
          reorderBlock(editingPage.id, blockId, dir)
        }
        previewPage={previewPage}
        setPreviewPage={setPreviewPage}
        pages={state.pages}
      />
    )
  }

  return (
    <div className="mx-auto max-w-6xl pb-24">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Pages & flow</h1>
        <p className="mt-1.5 text-muted-foreground">
          Build the campaign journey in order. Use{" "}
          <span className="font-medium text-foreground">Edit page</span> for
          content and button destinations; route slugs live under Advanced.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        {/* Flow diagram */}
        <div className="lg:col-span-3">
          <Card className="border-border/50 bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="gap-1.5">
                  <span className="font-mono">{state.pages.length}</span> pages
                </Badge>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    Entry
                  </span>
                  <span className="text-muted-foreground/50">Loading</span>
                </div>
                <Badge variant="outline" className="gap-1.5">
                  <Play className="h-3 w-3" />
                  Register after result
                </Badge>
                <Badge variant="outline" className="gap-1.5">
                  <Menu className="h-3 w-3" />
                  Menu
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {/* Section: Before Gameplay */}
                <div className="mb-4">
                  <Badge className="mb-3 bg-primary/10 text-primary hover:bg-primary/20">
                    BEFORE GAMEPLAY
                  </Badge>
                </div>

                {state.pages
                  .filter((p) =>
                    ["loading", "landing", "tutorial", "loading-video"].includes(
                      p.id
                    )
                  )
                  .map((page, idx) => (
                    <PageFlowCard
                      key={page.id}
                      page={page}
                      index={idx + 1}
                      isEntry={page.id === "loading"}
                      onEdit={() => {
                        setEditingPage(page)
                        setView("edit")
                      }}
                      onPreview={() => setPreviewPage(page.id)}
                      isPreviewActive={previewPage === page.id}
                    />
                  ))}

                {/* Section: Gameplay */}
                <div className="mb-4 mt-6">
                  <Badge className="mb-3 bg-primary/10 text-primary hover:bg-primary/20">
                    GAMEPLAY
                  </Badge>
                </div>

                {state.pages
                  .filter((p) => p.id === "game")
                  .map((page, idx) => (
                    <PageFlowCard
                      key={page.id}
                      page={page}
                      index={5}
                      onEdit={() => {
                        setEditingPage(page)
                        setView("edit")
                      }}
                      onPreview={() => setPreviewPage(page.id)}
                      isPreviewActive={previewPage === page.id}
                    />
                  ))}

                {/* Section: After Gameplay */}
                <div className="mb-4 mt-6">
                  <Badge className="mb-3 bg-primary/10 text-primary hover:bg-primary/20">
                    AFTER GAMEPLAY
                  </Badge>
                </div>

                {state.pages
                  .filter((p) =>
                    [
                      "result",
                      "register",
                      "voucher",
                      "leaderboard",
                      "menu",
                    ].includes(p.id)
                  )
                  .map((page, idx) => (
                    <PageFlowCard
                      key={page.id}
                      page={page}
                      index={idx + 6}
                      onEdit={() => {
                        setEditingPage(page)
                        setView("edit")
                      }}
                      onPreview={() => setPreviewPage(page.id)}
                      isPreviewActive={previewPage === page.id}
                    />
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview panel */}
        <div className="lg:col-span-2">
          <div className="sticky top-20">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Preview
                </span>
              </div>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Mock render of each page in your flow. Click CTAs and tabs to step
              through the wired-up navigation.
            </p>

            {/* Page tabs */}
            <div className="mb-4 flex flex-wrap gap-1.5">
              {state.pages.slice(0, 5).map((page, idx) => (
                <button
                  key={page.id}
                  onClick={() => setPreviewPage(page.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-all",
                    previewPage === page.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  )}
                >
                  <span className="font-medium">{idx + 1}</span>
                  {page.name}
                </button>
              ))}
            </div>

            {/* Phone mockup */}
            <div className="relative mx-auto w-full max-w-[280px]">
              <div className="overflow-hidden rounded-[2.5rem] border-[8px] border-muted bg-card shadow-2xl">
                <div className="aspect-[9/19.5] bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5">
                  <div className="flex h-full flex-col items-center justify-center p-6">
                    {/* Preview content */}
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
                      {currentPreviewPage && getPageIcon(currentPreviewPage.icon)}
                    </div>
                    <Badge className="mb-4 bg-primary/20 text-primary hover:bg-primary/30">
                      BRAND
                    </Badge>
                    <h3 className="mb-2 text-center text-lg font-bold text-foreground">
                      {currentPreviewPage?.name || "Loading"}
                    </h3>
                    <p className="mb-6 text-center text-sm text-muted-foreground">
                      {currentPreviewPage?.description || "Loading your experience..."}
                    </p>
                    <Button className="w-full max-w-[180px]">
                      Continue
                    </Button>
                  </div>
                </div>
              </div>
              <div className="mt-2 text-center text-xs text-muted-foreground">
                /{currentPreviewPage?.route.slice(1) || "loading"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PageFlowCard({
  page,
  index,
  isEntry,
  onEdit,
  onPreview,
  isPreviewActive,
}: {
  page: Page
  index: number
  isEntry?: boolean
  onEdit: () => void
  onPreview: () => void
  isPreviewActive: boolean
}) {
  return (
    <div
      className={cn(
        "group relative rounded-lg border p-4 transition-all",
        isPreviewActive
          ? "border-primary bg-primary/5"
          : "border-border/50 bg-card hover:border-border"
      )}
    >
      {/* Connection line */}
      {page.nextPage && (
        <div className="absolute -bottom-2 left-1/2 h-4 w-px -translate-x-1/2 bg-border" />
      )}

      <div className="flex items-start gap-3">
        {/* Drag handle and index */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="cursor-move text-muted-foreground/50 hover:text-muted-foreground">
            <GripVertical className="h-4 w-4" />
          </div>
          <div
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
              isEntry
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {index}
          </div>
          <div className="flex flex-col gap-0.5">
            <button className="rounded p-0.5 text-muted-foreground/50 hover:bg-muted hover:text-muted-foreground">
              <ChevronUp className="h-3 w-3" />
            </button>
            <button className="rounded p-0.5 text-muted-foreground/50 hover:bg-muted hover:text-muted-foreground">
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
              {getPageIcon(page.icon)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{page.name}</span>
                {isEntry && (
                  <Badge variant="secondary" className="text-[10px]">
                    ENTRY
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{page.description}</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px]">
              {page.route}
            </Badge>
            {page.nextPage && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  next
                </span>
                <span>→</span>
                <span className="font-medium capitalize">{page.nextPage}</span>
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="outline" size="sm" onClick={onPreview}>
            <Play className="mr-1.5 h-3 w-3" />
            Start here
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit3 className="mr-1.5 h-3 w-3" />
            Edit page
          </Button>
          <Button variant="ghost" size="icon-sm">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function PageEditor({
  page,
  onBack,
  toggleBlock,
  reorderBlock,
  previewPage,
  setPreviewPage,
  pages,
}: {
  page: Page
  onBack: () => void
  toggleBlock: (blockId: string) => void
  reorderBlock: (blockId: string, direction: "up" | "down") => void
  previewPage: string
  setPreviewPage: (id: string) => void
  pages: Page[]
}) {
  const currentPreviewPage = pages.find((p) => p.id === previewPage)
  const pageIndex = pages.findIndex((p) => p.id === page.id)
  const totalPages = pages.length

  return (
    <div className="mx-auto max-w-6xl pb-24">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Pages & flow</h1>
        <p className="mt-1.5 text-muted-foreground">
          Editing one page. Adjust its blocks, behavior and content, then step to
          the next page.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        {/* Editor panel */}
        <div className="lg:col-span-3">
          <Card className="border-border/50 bg-card">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <Button variant="outline" size="sm" onClick={onBack}>
                <ChevronLeft className="mr-1.5 h-3.5 w-3.5" />
                Back to flow
              </Button>
              <div className="text-sm text-muted-foreground">
                PAGE {pageIndex + 1} OF {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pageIndex === 0}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pageIndex === totalPages - 1}
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground">{page.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {page.description}
                </p>
              </div>

              {/* Blocks section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Blocks
                    </h3>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground/60">
                      pageBlocks.{page.id}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    All blocks added
                  </Button>
                </div>

                <div className="space-y-2">
                  {page.blocks.map((block, idx) => (
                    <div
                      key={block.id}
                      className={cn(
                        "flex items-center gap-4 rounded-lg border p-4 transition-all",
                        block.enabled
                          ? "border-border/50 bg-card"
                          : "border-transparent bg-muted/30"
                      )}
                    >
                      <Switch
                        checked={block.enabled}
                        onCheckedChange={() => toggleBlock(block.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "font-medium",
                              block.enabled
                                ? "text-foreground"
                                : "text-muted-foreground"
                            )}
                          >
                            {block.name}
                          </span>
                          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                            {block.key}
                          </code>
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {block.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={idx === 0}
                          onClick={() => reorderBlock(block.id, "up")}
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={idx === page.blocks.length - 1}
                          onClick={() => reorderBlock(block.id, "down")}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm">
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Page behavior section */}
              <div className="mt-8 space-y-4">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Page Behavior
                </h3>
                <div className="rounded-lg border border-border/50 bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-foreground">
                        Skip tutorial for returning players
                      </h4>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Returning players skip the tutorial and continue directly
                        to the next route.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <button className="hover:text-foreground">Default</button>
                        <button className="hover:text-foreground">Reset</button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Switch defaultChecked />
                    <span className="text-sm font-medium text-foreground">On</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview panel */}
        <div className="lg:col-span-2">
          <div className="sticky top-20">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Preview
              </span>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Mock render of each page in your flow. Click CTAs and tabs to step
              through the wired-up navigation. Real copy, branding and game
              runtime arrive at scaffold time via CAPE.
            </p>

            {/* Page tabs */}
            <div className="mb-4 flex flex-wrap gap-1.5">
              {pages.slice(0, 5).map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => setPreviewPage(p.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-all",
                    previewPage === p.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  )}
                >
                  <span className="font-medium">{idx + 1}</span>
                  {p.name}
                </button>
              ))}
            </div>

            {/* Phone mockup */}
            <div className="relative mx-auto w-full max-w-[280px]">
              <div className="overflow-hidden rounded-[2.5rem] border-[8px] border-muted bg-card shadow-2xl">
                <div className="aspect-[9/19.5] bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5">
                  <div className="flex h-full flex-col items-center justify-center p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
                      {currentPreviewPage && getPageIcon(currentPreviewPage.icon)}
                    </div>
                    <Badge className="mb-4 bg-primary/20 text-primary hover:bg-primary/30">
                      BRAND
                    </Badge>
                    <h3 className="mb-2 text-center text-lg font-bold text-foreground">
                      Welcome to next-
                      <br />
                      r3f-scaf-v2
                    </h3>
                    <p className="mb-6 text-center text-sm text-muted-foreground">
                      Are you ready to play?
                    </p>
                    <Button variant="outline" size="sm" className="mb-2 w-full max-w-[180px] text-xs">
                      RETURNING PLAYERS SKIP THE TUTORIAL
                    </Button>
                    <Button className="w-full max-w-[180px]">Play now</Button>
                  </div>
                </div>
              </div>
              <div className="mt-2 text-center text-xs text-muted-foreground">
                /{currentPreviewPage?.route.slice(1) || "landing"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
