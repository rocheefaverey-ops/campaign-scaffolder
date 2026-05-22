# Test the scaffolder — a user journey

You've been asked to confirm the campaign scaffolder still works end-to-end. This walks you through it as a real first-time user would. Expect ~15 minutes.

You'll generate a fresh campaign, boot it, click through every page, and confirm the bits that should be configurable from the CMS actually are. If anything along the way doesn't match what's described, that's the bug — note where and pass it back to the dev.

---

## Before you start

You need:

- **Node.js 20+** and **pnpm 10+** installed
- A terminal open in the `campaign-scaffolder/` folder
- A browser

Run once to set the project up:

```bash
pnpm install
pnpm run wizard:install
```

If these fail, stop and report — you can't continue.

---

## Step 1 — Launch the wizard

```bash
pnpm run wizard
```

> **You'll see:** the terminal start a server, then your browser opens at <http://localhost:3737>.

If the browser doesn't open by itself, paste the URL manually.

| ✅ Pass — you see this | ❌ Fail — you see this |
|---|---|
| Wizard opens on a "Project" screen | Browser shows a blank page or 404 |
| Terminal shows the server listening on `:3737` | `spawn EINVAL` or port-in-use errors |
| No "drift" errors in the prewizard tests | `KNOWN_PAGE_TYPES contains type(s) the wizard doesn't expose` |

**Result:** ☐ Pass  ☐ Fail — notes: ____________________

---

## Step 2 — Fill in the project

On the **Project** step:

- **Name:** `test-journey`
- **Default language:** NL
- **Timezone:** Europe/Amsterdam (or whatever is offered)
- **Brand:** `Test Brand`

Click **Next**.

> ✅ No red error banners.

---

## Step 3 — Connect to CAPE

On the **CAPE** step:

- Choose **Use existing campaign**
- Enter campaign id `62484`

Click **Validate**.

> **You'll see:** a green banner confirming the campaign was found.
>
> ✅ Validation succeeds. The Next button becomes available.

---

## Step 4 — Pick the stack

On the **Stack** step:

- Choose **TanStack Start + Unity**

> **You'll see:** NHL Crush appears pre-selected as the game.
>
> ✅ The card for TanStack + Unity is highlighted.

---

## Step 5 — Confirm the game

On the **Games** step:

- NHL Crush is already selected. Leave it.

> **You'll see:** game details (CDN URL, description). Continue.

---

## Step 6 — Lay out the flow

On the **Pages** step you'll see two columns: the page flow on the left, the live preview on the right.

The default flow should be:

> Intro video → Landing → Tutorial → Loading video → Game → Result → Leaderboard

**Things to try in the preview pane on the right:**

- Click each tab (Intro video, Landing, Tutorial, etc.). The preview should slide and fade in.
- Each tab shows the page name and below it the route in small grey type (e.g. `/landing`).
- On the **Landing** preview, click the hamburger icon top-right. A menu overlay appears with these buttons:
  - **Home** (dark)
  - **How to play** (lime)
  - **Terms** (outlined)
  - **Privacy** (outlined)
  - **Leave campaign** (red)
- On the **Tutorial** preview, the dots at the bottom indicate steps. Click a dot — the title and body change.
- On the **Leaderboard** preview, you see 5 mock players plus a highlighted row labeled `(you)`.

> ✅ Tabs animate.
> ✅ Menu overlay opens, colors match the list above.
> ✅ Tutorial dots are clickable.
> ✅ Leaderboard mock rows render.

There's **no** "Start real preview" button — that's intentional, ignore if you've seen one before.

Click **Next**.

---

## Step 7 — Modules

On the **Modules** step:

- Default selection is fine. You should see `scoring` and `leaderboard` shown as auto-included (because the leaderboard page is in the flow).

Click **Next**.

---

## Step 8 — Scaffold

On the **Build** step:

- Click **Scaffold**.

> **You'll see:** a streaming log of what the tool is doing — copying files, applying modules, installing packages.

| ✅ Pass — you see this | ❌ Fail — you see this |
|---|---|
| Log ends with a green post-scaffold checklist | Red error in the log, or the log just stops |
| Folder `test-journey/` now exists next to `campaign-scaffolder/` | No folder, or partial folder with missing `frontend/` |
| `test-journey/.scaffolded` file records your wizard config | `.scaffolded` is missing or empty |
| `git log` inside the new folder shows one initial commit | No git history (init failed) |

If the log shows a red error, copy the last 20 lines and pass them back. Stop here.

**Result:** ☐ Pass  ☐ Fail — notes: ____________________

---

## Step 9 — Open the project

In a new terminal:

```bash
cd ../test-journey/frontend
cp .env.example .env
pnpm install
pnpm dev
```

> **You'll see:** Vite log with a local URL — usually <http://localhost:3000>.

Open the URL in your browser.

| ✅ Pass — you see this | ❌ Fail — you see this |
|---|---|
| Vite reports a listening URL | Vite crashes on startup |
| `pnpm install` finishes without errors | Missing-peer-dependency errors that prevent install |
| First page renders without a type-error wall | Red Vite error overlay covers the screen |
| Browser DevTools console has no errors | Errors about missing imports or `useUnity` |

**Result:** ☐ Pass  ☐ Fail — notes: ____________________

---

## Step 10 — Walk through the campaign

What follows is the experience a real player would have. At each page, check that what you see matches what's described.

### 10.1 Intro video — `/intro-video`

A full-screen page. A video plays in the background (or a black placeholder if no video is uploaded yet). The Livewall logo sits top-left. At the bottom-centre is one lime pill button labelled **Continue**.

**What's on the page:**

| Control | Where | What it should do |
|---|---|---|
| Brand logo | Top-left | Decorative; not clickable |
| **Continue** button | Bottom-centre | Navigates to `/landing` |

**Try it:**

- Click **Continue** → URL changes to `/landing`.

| ✅ Pass — you see this | ❌ Fail — you see this |
|---|---|
| Continue is round (pill-shaped), lime, centered horizontally | Continue is a small button stuck in the bottom-right corner |
| Clicking Continue takes you to `/landing` | The page auto-advances without you clicking |
| Nothing happens until you click | Console shows a `useUnity must be used within a UnityProvider` error |

**Result:** ☐ Pass  ☐ Fail — notes: ____________________

### 10.2 Landing — `/landing`

A hero page. Big title (e.g. **Welcome to test-journey**), a short subline, a lime **Play now** button at the bottom. Top-left has the brand logo. Top-right has a circular hamburger icon (☰).

**What's on the page:**

| Control | Where | What it should do |
|---|---|---|
| Brand logo | Top-left | Decorative |
| Hamburger (☰) | Top-right | Opens the menu overlay (`/menu`) |
| **Play now** button | Bottom-centre | Navigates to `/tutorial` (or whichever next-step the flow editor set) |

**Try it:**

- Click the hamburger → menu opens (covered in 10.3).
- Close the menu (X) → you come back to Landing.
- Click **Play now** → URL changes to `/tutorial`.

| ✅ Pass — you see this | ❌ Fail — you see this |
|---|---|
| Title personalises with your brand name (e.g. "Welcome to Test Brand") | Title is just "Welcome" with no brand name |
| Hamburger icon is a circular grey button | Hamburger is a square or has no background |
| Hamburger opens the menu overlay | Hamburger does nothing or 404s |
| Play now navigates to `/tutorial` | Play now is invisible, wrong color, or routes somewhere unexpected |
| Hero image fills the screen with a dark overlay | Hero is missing — page looks like a blank colored panel |

**Result:** ☐ Pass  ☐ Fail — notes: ____________________

### 10.3 Menu — `/menu`

A panel overlay sliding in from the bottom. The top has the brand logo centered and an **X** close button top-right. The middle is a stack of menu buttons. Footer reads "Powered by Livewall".

**Buttons that should be visible (in order):**

| Button | Style | What it should do |
|---|---|---|
| **Home** | Dark / ink | Navigates to `/landing` |
| **How to play** | Lime / primary | Navigates to `/tutorial` |
| **Terms** | Outlined / tertiary | Opens the CAPE-configured Terms URL in a **new tab** |
| **Privacy** | Outlined / tertiary | Opens the CAPE-configured Privacy URL in a **new tab** |
| **Leave campaign** | Red / danger | Navigates to `/` (campaign entry) |

**Buttons that should NOT be visible:** Voucher, FAQ, Resume game. (Their routes weren't generated, so the menu hides them.)

**Header controls:**

| Control | Where | What it should do |
|---|---|---|
| Brand logo | Top-centre | Decorative |
| **X** close button | Top-right | Closes the menu — uses browser back if possible, otherwise returns to `/landing` |

**Try it:**

- Click **X** → you return to the page you came from (Landing).
- Open menu again. Click **Home** → goes to `/landing`.
- Open menu again. Click **How to play** → goes to `/tutorial`.
- Open menu again. Click **Terms** → opens the terms URL in a new tab. Close that tab.
- Open menu again. Click **Leave campaign** → goes to `/` (you'll briefly see the loader, then bounce to `/intro-video`).

| ✅ Pass — you see this | ❌ Fail — you see this |
|---|---|
| Exactly 5 menu items: Home / How to play / Terms / Privacy / Leave campaign | Voucher and/or FAQ are visible (= broken-link risk) |
| Home is dark, How to play is lime, Terms+Privacy are outlined, Leave is red | All buttons same color — variant system not wired |
| Close (X) is a round grey pill | Close button is square or invisible |
| Terms and Privacy open in a **new tab** | Terms/Privacy replace the current page or do nothing |
| Home routes to `/landing`, How to play to `/tutorial` | Either button 404s or routes to the wrong page |
| Leave campaign routes to `/` then bounces to `/intro-video` | Leave campaign stays on the menu or 404s |

**Result:** ☐ Pass  ☐ Fail — notes: ____________________

### 10.4 Tutorial — `/tutorial`

Full-screen hero with the tutorial content. Top-left brand logo. Top-right close (X). Centre-bottom has a kicker ("HOW TO PLAY"), a step title, a body, and pagination dots.

**What's on the page:**

| Control | Where | What it should do |
|---|---|---|
| Brand logo | Top-left | Decorative |
| **X** close | Top-right | Skips the tutorial — advances to the next step in the flow (`/loading-video`) |
| Pagination dots | Above the button | Each dot jumps to that step. Active dot is lime |
| **Continue** button | Bottom-centre | Advances to the next tutorial step. On the **last** step, the label changes to **Start** |
| **Start** button (on last step) | Bottom-centre | Advances to `/loading-video` |

**Try it:**

- You start on Step 1. Read the title and body.
- Click **Continue** → title flips to Step 2; the second dot becomes active.
- Click **Continue** → Step 3; third dot active; the button now says **Start**.
- Click the **first dot** → jumps back to Step 1; button reads **Continue** again.
- Click **Start** (from the last step) → URL changes to `/loading-video`.

| ✅ Pass — you see this | ❌ Fail — you see this |
|---|---|
| Three dots are visible and each represents a step | No dots, or wrong number of dots |
| Active dot is lime; inactive dots are grey | All dots look identical |
| Continue advances the step and updates the dots | Continue does nothing, or skips to the end immediately |
| Clicking a specific dot jumps to that step | Dots aren't clickable |
| Button label changes to **Start** on the last step | Last step still says **Continue** |
| **Start** navigates to `/loading-video` | Start 404s or routes back to landing |
| **X** in the top-right skips the tutorial | X does nothing, or X is square instead of round |

**Result:** ☐ Pass  ☐ Fail — notes: ____________________

### 10.5 Loading video — `/loading-video`

A loop / spinner page that boots the Unity game in the background. Brand logo + spinner are usually visible while loading.

**What's on the page:**

| Control | Where | What it should do |
|---|---|---|
| Loader / spinner | Centre | Visual only — shows Unity is initialising |
| **Skip / Continue** button (only if Unity fails) | Bottom-right | Escape hatch: navigates to `/game` even though Unity didn't finish booting |

**Try it:**

- Wait. The page should advance automatically to `/game` once Unity is ready (typically 1–5 seconds).
- You do **not** click anything in the happy path.

| ✅ Pass — you see this | ❌ Fail — you see this |
|---|---|
| Page auto-advances to `/game` within ~5 seconds | Page sits on the loader for more than 30 seconds |
| You don't need to click anything | A skip button appears (= Unity failed to boot) |
| No console errors | Console shows `useUnity must be used within a UnityProvider`, or Unity 404s |
| URL transitions from `/loading-video` → `/game` cleanly | URL stays stuck, or jumps back to `/landing` |

**Result:** ☐ Pass  ☐ Fail — notes: ____________________

### 10.6 Game — `/game`

The Unity canvas takes the whole screen. Play a round (or end it however the game lets you — wait for the timer, score enough points, etc.).

**What's on the page:**

| Control | Where | What it should do |
|---|---|---|
| Unity canvas | Full screen | The game itself — controls vary by game |
| Tab visibility | (Browser tab) | Switching tabs pauses the game; returning resumes it |

**Try it:**

- Play through to a natural end-of-game event.
- The app should auto-route to `/result` when the game emits its end event.

| ✅ Pass — you see this | ❌ Fail — you see this |
|---|---|
| Unity canvas takes the full screen | Black screen, or canvas only takes part of the screen |
| Game is playable (controls respond) | Inputs do nothing |
| Switching browser tabs pauses the game; returning resumes it | Game keeps running in the background |
| End-of-game automatically routes to `/result` | You're stuck on the game canvas after game-over |
| No console errors during play | Console shows Unity errors or `useUnity` errors |

**Result:** ☐ Pass  ☐ Fail — notes: ____________________

### 10.7 Result — `/result`

Hero page. Brand logo top-left. Hamburger (☰) top-right. Centre shows a kicker ("RESULT"), a title ("Game over" or similar), a score plate with the score you achieved, and a stack of buttons.

**What's on the page:**

| Control | Where | What it should do |
|---|---|---|
| Brand logo | Top-left | Decorative |
| Hamburger (☰) | Top-right | Opens the menu overlay (same as Landing) |
| Score plate | Centre | Displays your final score |
| **Continue** button | Bottom-centre, lime | Navigates to `/leaderboard` (or whichever next-route the flow editor set) |
| **Play again** button | Below Continue, dark | Navigates to `/loading-video` (which then boots into `/game`) |
| **Leaderboard** button | Below Play again, only if enabled | Navigates to `/leaderboard` |

**Try it:**

- Click **Play again** → URL goes to `/loading-video`, then to `/game`. You play again.
- End the game again to come back to Result.
- Click **Continue** → URL goes to `/leaderboard`.

| ✅ Pass — you see this | ❌ Fail — you see this |
|---|---|
| Score plate shows the value the game emitted | Score reads 0 or blank |
| **Continue** is lime, **Play again** is dark | Buttons all look the same colour |
| Play again routes through `/loading-video` first | Play again goes directly to `/game` and shows a broken loader |
| Returning to Result after a re-play shows the new score | Score is stale from the previous round |
| Continue navigates to `/leaderboard` | Continue does nothing or 404s |
| Hamburger opens the same menu as Landing | Menu doesn't open from Result |
| No `useUnity must be used within a UnityProvider` error | That error appears in the console during a navigation |

**Result:** ☐ Pass  ☐ Fail — notes: ____________________

### 10.8 Leaderboard — `/leaderboard`

Hero page. Brand logo top-left. Hamburger (☰) top-right. Title ("Leaderboard"), three tabs underneath, a scrollable list of entries, and two action buttons at the bottom.

**What's on the page:**

| Control | Where | What it should do |
|---|---|---|
| Brand logo | Top-left | Decorative |
| Hamburger (☰) | Top-right | Opens the menu overlay |
| **Back X** button | Top-right (next to hamburger) | Goes back one page (browser history) |
| **Weekly** tab | Below title | Shows the weekly mock entries |
| **Monthly** tab | Centre tab | Shows the monthly mock entries |
| **All-time** tab | Right tab | Shows the all-time mock entries |
| Personal best row | Top of the list, highlighted | The "you" row (rank 27 in mock data) — visually distinct from the top 5 |
| Top 5 rows | Below the personal row | Mock leaderboard entries — names + scores |
| **Play again** button | Bottom-centre, lime | Navigates to `/loading-video` (then `/game`) |
| **Home** button | Below Play again, dark | Navigates to `/landing` |

**Try it:**

- Click **Weekly** → table shows 5 weekly mock rows. Top row should be a name like "Sanne" with the highest score.
- Click **Monthly** → table changes; "Bram" should be #1.
- Click **All-time** → table changes again; "Liam" should be #1.
- Verify the personal best row stays visible across all three tabs.
- Click **Play again** → URL goes through `/loading-video` to `/game`. (Same flow as Result.)
- After playing again and reaching Leaderboard again, click **Home** → URL goes to `/landing`.

| ✅ Pass — you see this | ❌ Fail — you see this |
|---|---|
| Three tabs render, active one is highlighted | Tabs missing, or all look identical |
| Each tab shows a different set of 5 mock entries | All three tabs show the same names |
| Personal best row visible above the top 5, visually distinct | No personal row, or it looks the same as the others |
| Personal best row stays visible across tabs | Personal row disappears when switching tabs |
| Play again routes through `/loading-video` first | Play again goes directly to `/game` and shows a broken loader |
| Home routes to `/landing` | Home does nothing or 404s |
| No `useUnity must be used within a UnityProvider` error | That error appears during navigation |

**Result:** ☐ Pass  ☐ Fail — notes: ____________________

---

## Step 11 — Tweak it from CAPE (optional but valuable)

These are the controls a campaign manager would actually use. You don't need to do them all — pick one or two to confirm the wiring works.

Open the CAPE Studio for campaign 62484.

### Hide a menu item

- Find `settings.menu.showLeaderboard`. Set it to `false`. Publish.
- Hard-refresh your browser (`Ctrl+Shift+R`).
- Open the menu.

| ✅ Pass — you see this | ❌ Fail — you see this |
|---|---|
| Leaderboard item is gone from the menu | Leaderboard still visible after refresh |
| Other menu items are unaffected | Other items disappear too (= you edited the wrong field) |

**Result:** ☐ Pass  ☐ Fail — notes: ____________________

### Restyle a menu button

- Find `settings.menu.variantHome`. Set it to `danger`. Publish, refresh.
- Open the menu.

| ✅ Pass — you see this | ❌ Fail — you see this |
|---|---|
| Home button is red | Home button still dark (= CAPE not refreshing) or wrong colour |
| Set `variantHome` to a nonsense value (e.g. `xyz`), refresh — Home falls back to dark (`secondary`) | Home stays red, or breaks the page entirely |
| All other buttons unchanged | Other buttons also turned red |

Restore `variantHome` to `secondary` (or clear it) when done.

**Result:** ☐ Pass  ☐ Fail — notes: ____________________

### Change the brand color

- Find `settings.branding.primaryColor`. Set it to `#3366FF` (or any hex blue). Publish, refresh.

| ✅ Pass — you see this | ❌ Fail — you see this |
|---|---|
| **Play now** on Landing is now blue | Play now stays lime |
| All other primary (lime) buttons in the app are blue too | Some buttons updated but others didn't |
| Dark / outlined / red buttons stay unchanged | Other variants also changed colour (= CSS leak) |

Restore the original colour when done.

**Result:** ☐ Pass  ☐ Fail — notes: ____________________

### Change the display font

- Set `settings.branding.displayFontFamily` to `"Times New Roman", serif`. Publish, refresh.

| ✅ Pass — you see this | ❌ Fail — you see this |
|---|---|
| `Welcome to …` title on Landing renders in serif | Title stays sans-serif |
| Body copy and form labels stay in Stabil Grotesk (sans) | Body text flips to serif too (= overreach) |

Revert all CAPE changes when you're done so the next test run starts clean.

**Result:** ☐ Pass  ☐ Fail — notes: ____________________

---

## Step 12 — Wrap up

Close the dev server (`Ctrl+C` in the terminal running `pnpm dev`).

Clean up the test folder:

```bash
cd ../../campaign-scaffolder
pnpm run teardown -- test-journey
```

That removes the generated project. The scaffolder itself is untouched.

---

## Final results sign-off

Transfer the per-step pass/fail outcomes here for a single-page overview. Anything in **Fail** is a regression to report.

### Setup

| Step | Pass | Fail | Notes |
|---|:---:|:---:|---|
| 1. Launch the wizard | ☐ | ☐ | |
| 8. Scaffold completes | ☐ | ☐ | |
| 9. Project boots | ☐ | ☐ | |

### Page walkthrough

| Step | Pass | Fail | Notes |
|---|:---:|:---:|---|
| 10.1 Intro video | ☐ | ☐ | |
| 10.2 Landing | ☐ | ☐ | |
| 10.3 Menu | ☐ | ☐ | |
| 10.4 Tutorial | ☐ | ☐ | |
| 10.5 Loading video | ☐ | ☐ | |
| 10.6 Game | ☐ | ☐ | |
| 10.7 Result | ☐ | ☐ | |
| 10.8 Leaderboard | ☐ | ☐ | |

### CAPE overrides (optional)

| Test | Pass | Fail | Notes |
|---|:---:|:---:|---|
| Hide a menu item | ☐ | ☐ | |
| Restyle a menu button | ☐ | ☐ | |
| Change the brand color | ☐ | ☐ | |
| Change the display font | ☐ | ☐ | |

### Verdict

- ☐ **All green** — scaffolder is good to ship.
- ☐ **Some fails** — see notes; pass back to the dev with screenshots / console output.

### If everything passed, you've confirmed:

- ✅ A fresh scaffold completes without errors
- ✅ The wizard works through all its steps
- ✅ The preview pane renders each page mock correctly
- ✅ The generated app boots first try
- ✅ All seven pages render, navigate, and the flow chains correctly
- ✅ The hamburger menu respects which routes were generated (no broken links)
- ✅ Menu colors match the agency defaults
- ✅ "Play again" on Result and Leaderboard routes through Loading video — no broken loaders
- ✅ Round buttons stay round across the experience
- ✅ CAPE-driven changes (visibility, button style, branding color) take effect after a refresh

If anything along the way *didn't* match, send back:

1. Which step number it was (e.g. "Step 10.7, on Play again")
2. What you saw vs. what you expected
3. A screenshot if it's visual, or the last 20 lines of the terminal if it's an error

Thanks 🙏
