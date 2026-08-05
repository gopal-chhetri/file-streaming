# Aurora Design System

## Brand
- **Name**: "aurora": lowercase, weight 500, no logomark
- **Typeface**: Geist (Inter fallback)
- **Weights**: 400 body, 500 labels/headings
- **Voice**: Vibrant, cinematic, ethereal. Named after the Northern Lights: the UI should feel like a glowing night sky.

## Mode
- **Surface**: Operate: users browse, discover, watch, and manage videos. Design serves speed and delight.

## Color System

### Concept
Inspired by the aurora borealis. The palette sweeps from deep space (dark bg) through indigo, cyan, and violet: like the lights dancing across the sky. Light mode keeps a cooler, airy feel with the same spectral progression.

### Core palette

| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| `--page-bg` | `#f8f7fa` | `#07070a` | Page background: cool off-white / deep space |
| `--surface` | `#ffffff` | `#111116` | Card/surface background |
| `--surface-raised` | `#fcfcff` | `#181820` | Hovered/raised surface |
| `--border` | `#e8e6f0` | `#22223a` | Default border |
| `--border-glow` | `rgba(99, 102, 241, .12)` | `rgba(129, 140, 248, .15)` | Accent glow border |

| `--text-primary` | `#18181b` | `#ededf0` | Body text |
| `--text-secondary` | `#6b6a80` | `#a09fb8` | Secondary text |
| `--text-muted` | `#9c9bb0` | `#6b6a84` | Muted/placeholder |

| `--accent` | `#6366f1` | `#818cf8` | Primary accent: indigo (aurora core) |
| `--accent-glow` | `rgba(99, 102, 241, .25)` | `rgba(129, 140, 248, .35)` | Accent glow |
| `--accent-bg` | `#eef2ff` | `#1e1e3a` | Accent background tint |
| `--accent-text` | `#4338ca` | `#a5b4fc` | Text on accent bg |

| `--secondary` | `#06b6d4` | `#22d3ee` | Secondary accent: cyan (aurora edge) |
| `--secondary-glow` | `rgba(6, 182, 212, .2)` | `rgba(34, 211, 238, .3)` | Cyan glow |

| `--tertiary` | `#8b5cf6` | `#a78bfa` | Tertiary accent: violet (aurora tail) |
| `--tertiary-glow` | `rgba(139, 92, 246, .2)` | `rgba(167, 139, 250, .3)` | Violet glow |

| `--success` | `#10b981` | `#34d399` | Success: emerald |
| `--warning` | `#f59e0b` | `#fbbf24` | Warning: amber |
| `--danger` | `#ef4444` | `#f87171` | Danger: red |

### Gradient direction
Progress bars and decorative elements sweep **indigo → cyan → violet** (left to right), mimicking the aurora's colour layering.

### Elevation shadows (dark mode)
- `--shadow-sm`: `0 1px 2px rgba(0,0,0,.4)`
- `--shadow-md`: `0 4px 12px rgba(0,0,0,.5)`
- `--shadow-lg`: `0 8px 32px rgba(0,0,0,.6)`
- `--shadow-glow-accent`: `0 0 12px var(--accent-glow)`
- `--shadow-glow-secondary`: `0 0 12px var(--secondary-glow)`
- `--shadow-glow-tertiary`: `0 0 12px var(--tertiary-glow)`

## Typography
- **Body**: `--font-sans: 'Geist', 'Inter', system-ui, sans-serif`
- **Mono**: `--font-mono: 'JetBrains Mono', 'Fira Code', monospace`: timestamps & bytes only
- **Scale**: text-xs(12) → text-sm(14) → text-base(16) → text-lg(18) → text-xl(20) → text-2xl(24) → text-3xl(30)
- **Line-height**: 1.5 body, 1.35 headings
- **Weight**: only 400 (body) and 500 (labels, headings)

## Layout
- **Sidebar**: 220px (`w-55`) fixed, icon-only collapse at <768px
- **Content max-width**: 1440px
- **Spacing rhythm**: 4px base → 16px (p-4) default content pad → 24px section gap
- **Desktop-first**: mobile works but is secondary

## Motion
- **Duration**: 150ms micro-interactions, 250ms transitions, 350ms page enters
- **Easing**: `cubic-bezier(.4,0,.2,1)`: standard curve for everything
- **Hover lift**: card `translateY(-2px)` + `box-shadow` transition
- **Glow**: `box-shadow` transition for accent glow on interactive elements
- **Sidebar**: collapse/expand with width transition
- **Page enters**: subtle `translateY(4px) + opacity 0→1` with 50ms stagger per child
- **Video player**: controls fade with 8px backdrop-blur

## Component Principles
- **No AI slop**: No over-rounded corners (8px max), no glassmorphism outside player controls, no beige-on-beige, no italic serif, no pulsing dots, no "card in card"
- **Lists over grids**: Default to list layout for browse
- **Thumbnails**: 64×36 list, 16:9 grid, gradient progress bar overlay
- **Borders**: Thin (1px), subtle, never high-contrast. Active states use glow instead.
- **Spacing**: Generous. Never crammed.

## Anti-patterns (DO NOT)
- ❌ Over-rounded corners (radius > 8px)
- ❌ Glassmorphism outside video player controls
- ❌ Beige-on-beige / gray-on-gray
- ❌ Italic serif anywhere
- ❌ Pulsing/breathing animations
- ❌ Cards nested in cards
- ❌ "Modern" gradients as backgrounds
- ❌ Ghost buttons as primary CTA
- ❌ Over-elevation (shadows > 32px)
- ❌ Monospace outside timestamps and byte counts
