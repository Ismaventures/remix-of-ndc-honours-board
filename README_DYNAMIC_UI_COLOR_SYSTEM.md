# Dynamic UI Color System Plan (Approval Draft)

## 1. Purpose
This document defines a professional, military-grade dynamic color strategy for the existing NDC Honours Board software (this project) before implementation.

Project context:
- Repository: remix-of-ndc-honours-board
- Product focus: NDC historical honours and personnel display experience (FWC, FDCproc, Directing Staff, Allied)
- Goal: improve environmental readability and command-grade visual consistency without changing core product identity

Scope:
- Four global UI modes (2 outdoor, 2 indoor)
- Full app-wide token-based color switching
- Admin manual override with preview
- Preservation of critical status and identity colors
- No page reload when switching themes

## 2. Current UI Color Audit (Existing Software)

### 2.1 Strengths in the Current Design
- The project already uses global CSS variables in src/index.css for core tokens:
  - --background, --foreground, --card, --primary, --accent, --border, etc.
- Tailwind color mapping is already token-driven in tailwind.config.ts using hsl(var(--token)).
- Existing style language is militarized and premium:
  - Navy + gold base palette
  - Strong typography hierarchy
  - Professional gradients and cinematic transitions

### 2.2 Current Gaps to Close
- Some components still use hardcoded utility colors (example patterns):
  - from-white, to-white, bg-black/60, text-white
- Hardcoded colors can reduce consistency when global mode changes.
- No centralized runtime theme mode controller yet.
- No admin-level theme workflow (preview, apply, reset).

## 3. Target Theme Modes (Required by Prompt)

### Outdoor Mode 1: Tactical Light
- background: #FFFFFF
- textPrimary: #0B1F3A
- accent: #C9A646
- supporting accents: restrained #1F6B3A and #8B0000 for identity-only highlights
- visual goal: bright-screen readability with NDC core identity on white surfaces

### Outdoor Mode 2: High Contrast Command
- background: #000000
- textPrimary: #FFFFFF
- accentPrimary: #00FF9C
- accentAlternative: #FFC107
- visual goal: maximum readability and emergency visibility

### Indoor Mode 1: Defence Classic
- background: #0B1F3A
- textPrimary: #F5F7FA
- accent: #C9A646
- visual goal: institutional prestige and command authority

### Indoor Mode 2: Modern Command UI
- background: #1A1A1A
- textPrimary: #E0E0E0
- accent: #00BFFF
- visual goal: modern intelligence dashboard aesthetics

## 4. Professional Token Architecture

To preserve compatibility with your current stack, modes will map into existing and extended tokens.

### 4.1 Core Tokens
- background
- foreground
- card
- card-foreground
- popover
- popover-foreground
- primary
- primary-foreground
- secondary
- secondary-foreground
- muted
- muted-foreground
- accent
- accent-foreground
- border
- input
- ring

### 4.2 Optional Extended Tokens
- surface-1
- surface-2
- text-secondary
- overlay
- focus-outline
- sidebar-background
- sidebar-foreground

## 5. Selective Color Preservation (Non-Negotiable)

The dynamic theme system must not override these categories:

1. Status colors:
- error remains red
- success remains green
- warning remains amber/yellow
- info remains blue

2. Identity assets:
- logos, insignia, flags remain original source colors

3. Critical indicators:
- alert chips, security highlights, and warning banners keep dedicated semantic colors

4. Accessibility:
- maintain WCAG contrast baselines for body text, controls, and interactive states

## 6. Admin Theme Control Module (Planned)

### Required controls
- Mode selector:
  - Outdoor 1 (Tactical Light)
  - Outdoor 2 (High Contrast Command)
  - Indoor 1 (Defence Classic)
  - Indoor 2 (Modern Command UI)
- Live preview area
- Apply button
- Reset to default button

### Optional advanced control
- Auto mode by time profile:
  - day schedule -> outdoor mode
  - night schedule -> indoor mode

## 7. UI Application Strategy

### 7.1 Global runtime strategy
- Add a central ThemeContext (or Zustand store) with:
  - currentMode
  - previewMode
  - setMode
  - applyPreview
  - resetMode
- Write mode token values into CSS variables on :root at runtime.

### 7.2 Component compliance strategy
- Replace hardcoded white/black color utilities with token-backed classes.
- Keep overlays and shadows but derive them from tokenized surfaces.
- Keep current visual identity style (military premium look), not a full redesign.

### 7.3 Motion and performance
- Use 0.3s to 0.5s transitions for color updates.
- Avoid full reload and avoid expensive re-mounts.
- Theme switch should be instant at variable level.

## 8. Rollout Plan (Implementation Phases)

Phase 1: Foundation
- Create theme mode schema and token maps
- Build global ThemeProvider
- Add persistence (localStorage) for active mode

Phase 2: UI Refactor Coverage
- Migrate hardcoded white/black usages in key screens first:
  - AutoRotationDisplay
  - CommandantHero
  - ProfileModal
- Migrate shared UI wrappers (dialog overlays/panels) where necessary

Phase 3: Admin Controls
- Build Admin Theme Control Module
- Add live preview and apply/reset flow

Phase 4: Validation
- Contrast checks per mode
- Outdoor readability validation for large display scenarios
- Regression test key pages and modal states

## 9. Acceptance Criteria for Approval

Implementation should only be considered complete when:
- All four modes switch globally with no page reload
- Main pages, cards, nav, panels, and modals respond to mode change
- Status/alert colors remain preserved and unchanged
- Identity graphics are color-accurate
- Contrast remains readable across display conditions
- Admin can preview, apply, and reset mode instantly

## 10. Recommendation Before Build

Recommended default startup mode:
- Indoor Mode 1 (Defence Classic)

Reason:
- It is closest to the current navy/gold brand direction and minimizes visual disruption while enabling your new dynamic architecture.

---
Prepared for approval before implementation.
Once approved, implementation can proceed in phased commits to reduce UI risk and maintain quality.