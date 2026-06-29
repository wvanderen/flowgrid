---
name: Flowgrid
description: A calm systems-game interface where real effort becomes visible signal in a modular hex lattice.
colors:
  flowgrid-bg: "#0f172a"
  flowgrid-surface: "#1e293b"
  core: "#fbbf24"
  core-hover: "#fcd34d"
  cell-default: "#6b7280"
  cell-activated: "#f59e0b"
  cell-route: "#475569"
  error: "#ef4444"
  slate-100: "#f1f5f9"
  slate-200: "#e2e8f0"
  slate-300: "#cbd5e1"
  slate-400: "#94a3b8"
  slate-500: "#64748b"
  slate-600: "#475569"
  slate-700: "#334155"
  slate-900: "#0f172a"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0"
  title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0"
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "0"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0"
rounded:
  md: "6px"
  lg: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.core}"
    textColor: "{colors.flowgrid-bg}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    typography: "{typography.label}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.slate-200}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    typography: "{typography.label}"
  panel:
    backgroundColor: "{colors.flowgrid-surface}"
    textColor: "{colors.slate-300}"
    rounded: "{rounded.lg}"
    padding: "16px"
  stat-tile:
    backgroundColor: "#0f172a66"
    textColor: "{colors.slate-100}"
    rounded: "{rounded.md}"
    padding: "8px"
  field:
    backgroundColor: "{colors.slate-900}"
    textColor: "{colors.slate-100}"
    rounded: "{rounded.md}"
    padding: "4px 8px"
---

# Design System: Flowgrid

## 1. Overview

**Creative North Star: "The Living Instrument"**

Flowgrid's interface is a dark, quiet instrument panel for attention: direct enough to trust when the user has limited energy, but alive enough that effort feels like signal moving through a system. The React shell stays familiar and restrained; the Pixi lattice carries the magical layer through hex geometry, Current trails, Core glow, and activation halos.

The product should feel calm, precise, and quietly magical. It must protect the Generator path: open the app, tap a Cell, start a session. Panels, chips, docks, and dialogs support that path; they do not compete with it. The visual system rejects generic productivity dashboards, overstimulating game UI, passive idle-game spectacle, canvas-only affordances, and marketing-site tropes inside the app shell.

**Key Characteristics:**
- Dark slate substrate with amber used as rare action signal.
- System sans typography, compact hierarchy, and predictable product controls.
- Flat panels with crisp borders; shadows appear only for overlays, menus, and the selected dock.
- Canvas identity is vivid, but critical actions always have semantic HTML peers.
- Copy stays neutral and forgiving, especially around return, recovery, and unfinished work.

## 2. Colors

The palette is a restrained dark product system with one warm gameplay accent and a separate electric canvas vocabulary.

### Primary
- **Core Amber**: the primary action and selection signal. Use for Generator actions, Core headings, focus rings, important links, module icons, and completion state. Its rarity is what makes it powerful.
- **Core Hover Amber**: the hover state for Core Amber buttons. Use only for interactive feedback.

### Secondary
- **Cell Gray**: the default Cell color for user-created Cells and fallback lattice state.
- **Activated Amber**: the Cell activation color for Bloom and activated session states.
- **Route Slate**: the neutral route/connection color in durable tokens.

### Tertiary
- **Canvas Current Cyan**: used inside the Pixi renderer for route glow and particle Current. It is not a normal app-shell accent.
- **Canvas Core Violet**: used inside the Pixi renderer for the Core's magical center. It is not used for HTML buttons or labels.

### Neutral
- **Flowgrid Deep Space**: the body and takeover background. It should read like a stable work surface, not decorative dark mode.
- **Flowgrid Surface**: panel, dialog, dock, module tile, and inspector background.
- **Slate Text Ramp**: `slate-100` for values and headings, `slate-300` for body text, `slate-400` for secondary status copy, `slate-500` for placeholders, `slate-600` and `slate-700` for borders and hover fills.
- **Error Red**: destructive actions, validation failures, rejected commands, and persistence errors.

### Named Rules
**The Amber Is Signal Rule.** Core Amber is for primary action, selected state, and important system consequence only. Do not use it as decoration.

**The Canvas Has the Magic Rule.** Cyan, violet, bloom green, and glow effects belong mainly to the Pixi lattice. The HTML shell stays quieter so the playable surface can breathe.

## 3. Typography

**Display Font:** system sans (`ui-sans-serif`, `system-ui`, `Segoe UI`, `Roboto`, sans-serif)
**Body Font:** system sans (`ui-sans-serif`, `system-ui`, `Segoe UI`, `Roboto`, sans-serif)
**Label/Mono Font:** system mono for timers only (`ui-monospace`, `SFMono-Regular`, `Menlo`, `Monaco`, `Consolas`, monospace)

**Character:** The type is familiar, compact, and utilitarian. Flowgrid does not use decorative display type; the depth comes from the lattice, not typography theater.

### Hierarchy
- **Display** (700, 30px, 1.2): route titles such as Flowgrid, Core, Forge, Settings, and selected Cell names.
- **Headline** (600, 18px, 1.5): Generator headings, dialog titles, summaries, and important panel headings.
- **Title** (600, 16px, 1.5): section headings inside Core, Forge, Settings, module tiles, and inspectors.
- **Body** (400, 16px, 1.5): instructional and explanatory text. Keep longer prose below 75ch; most app copy should be shorter.
- **Label** (500-600, 12-14px, normal or wide uppercase for stat `dt` only): controls, stat labels, navigation, status chips, and secondary actions.
- **Mono** (600, 18px, 1.5): running session and rejuvenation timers only.

### Named Rules
**The Product Sans Rule.** Use one sans family for the app shell. Do not introduce display fonts in labels, buttons, data, or panels.

**The Timer Exception Rule.** Monospace exists to make elapsed time stable. Do not use mono as a mood layer elsewhere.

## 4. Elevation

Flowgrid is flat by default. Depth is conveyed through tonal layering, borders, and spatial placement: Deep Space body, Surface panels, darker stat tiles, and the persistent canvas frame. Shadows are reserved for menus, dialogs, and the Z-Lift dock because those surfaces truly float above the canvas or page.

### Shadow Vocabulary
- **Dock Float** (`shadow-xl`): used by the selected Cell dock so it reads as an active semantic control surface beside or below the canvas.
- **Menu Float** (`shadow-xl`): used for the mobile Cell switcher menu.
- **Dialog Float** (`shadow-2xl`): used for create/edit/import dialogs over a dark overlay.

### Named Rules
**The Flat Until It Floats Rule.** Panels and cards are flat at rest. If a surface is in normal document flow, use border and tone instead of shadow.

## 5. Components

### Buttons
- **Shape:** gently curved rectangle (6px radius).
- **Primary:** Core Amber background, Deep Space text, medium or semibold weight, 8px vertical and 16px horizontal padding. The button is direct, dense, and unmistakable.
- **Hover / Focus:** hover shifts to Core Hover Amber; focus uses a 2px Core Amber visible ring. Disabled keeps the same shape and color but drops to 50% opacity with `cursor-not-allowed`.
- **Secondary / Ghost / Tertiary:** transparent background, `slate-600` border, `slate-200` text, `slate-700` hover fill, and `slate-400` focus ring. Destructive secondary actions use Error Red border/text with a red-tinted hover fill.

### Chips
- **Style:** return cues are intentionally plain text or underlined text buttons, not heavy pills. They sit in a flexible rail with 12px gaps.
- **State:** actionable chips use Core Amber underlined text; informational chips use `slate-400`. Never make return cues louder than the Generator or canvas.

### Cards / Containers
- **Corner Style:** panels and module tiles use 8px radius; stat tiles use 6px radius.
- **Background:** standard panels use Flowgrid Surface; embedded stat tiles use translucent Deep Space.
- **Shadow Strategy:** no shadow in normal flow. Use Dock Float, Menu Float, or Dialog Float only for floating surfaces.
- **Border:** panels use `slate-700`; protected Generator and completion summaries use a 50% Core Amber border.
- **Internal Padding:** standard panels use 16px; stat tiles use 8px; dialogs use 24px.

### Inputs / Fields
- **Style:** dark `slate-900` or translucent `slate-900/50` background, `slate-600` border, `slate-100` value text, 6px radius.
- **Focus:** border shifts to Core Amber and adds a 1px or 2px Core Amber visible ring.
- **Error / Disabled:** validation errors render as Error Red text below the field. Disabled buttons use opacity and cursor affordance rather than changing layout.

### Navigation
- **Style:** simple text links, underlined by default, `slate-400` for secondary nav and Core Amber for primary return links. The mobile Cell switcher is a bordered button with a Lucide icon and a Radix menu.
- **Active / Hover:** hover and highlighted menu states shift toward Core Amber or `slate-700` fill. Navigation should never become a decorative tab system unless the screen actually needs tabs.

### Flowgrid Canvas
The canvas is the signature component: a 60-70vh framed surface with 8px radius, `slate-700` border, and translucent Deep Space background. The Pixi scene uses crisp hex geometry, cyan route glow, violet Core energy, Bloom green activation, and particles. If WebGL fails, the frame remains the same size and provides semantic fallback guidance.

### Generator
The Generator is the protected primary gameplay component. It uses a Core Amber heading, Core-bordered panel, concise explanatory copy, and the most obvious primary button on the selected Cell board. It must remain reachable without navigating through Forge, Settings, history, or configuration.

## 6. Do's and Don'ts

### Do:
- **Do** keep the Generator path visually and interactively obvious on every relevant screen.
- **Do** use Core Amber for primary actions, focus rings, selected state, and meaningful gameplay consequence.
- **Do** pair every important canvas action with semantic HTML controls, labels, statuses, and keyboard paths.
- **Do** keep app-shell panels compact: 8px radius, 16px padding, border-first depth, and predictable button shapes.
- **Do** use reduced-motion settings to preserve meaning without particle or ticker motion.
- **Do** keep recovery and return copy neutral: surface opportunity, stored progress, and next useful action.

### Don't:
- **Don't** build generic productivity dashboards that foreground charts, task tables, streak pressure, or shame-coded catch-up language.
- **Don't** make overstimulating game UI where rewards are louder than the real action the user came to do.
- **Don't** create passive idle-game visuals where offline accumulation feels more important than effort and recovery.
- **Don't** hide critical actions inside the canvas without keyboard, screen reader, or normal form equivalents.
- **Don't** import marketing-site visual tropes into the app shell: oversized hero sections, decorative card grids, tiny uppercase eyebrows, gradient text, or ornamental motion.
- **Don't** use side-stripe accent borders, gradient text, glassmorphism, ghost-card border-plus-wide-shadow decoration, or rounded cards above 16px.
