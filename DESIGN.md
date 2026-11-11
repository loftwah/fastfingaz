---
name: Thinktype
description: A typing instrument for thoughts — a field instrument for measuring composition speed in ChatGPT.
colors:
  ink: "#0b0b0a"
  paper: "#f2efe6"
  paper-deep: "#e8e3d7"
  signal-orange: "#ff4d00"
  signal-orange-display: "#e84a00"
  signal-orange-ink: "#b83600"
  white: "#f7f5ef"
  muted-dark: "#9a9488"
  muted-paper: "#6d675c"
  line-dark: "#2a2824"
  line-paper: "#d5cfc1"
typography:
  display:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "12.25rem"
    fontWeight: 500
    lineHeight: 0.86
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Geist Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "3.375rem"
    fontWeight: 600
    lineHeight: 1.03
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "3.25rem"
    fontWeight: 500
    lineHeight: 0.84
    letterSpacing: "-0.04em"
  body:
    fontFamily: "Geist Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  label:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.5625rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.16em"
  wordmark:
    fontFamily: "Geist Pixel, Geist Mono, ui-monospace, monospace"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.02em"
rounded:
  control: "2px"
  panel: "6px"
  hud: "12px"
  document: "0px"
  orb: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "8px 10px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.signal-orange}"
    textColor: "{colors.ink}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 10px"
  hud:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.hud}"
    padding: "10px 12px 12px"
    width: "360px"
  hud-display:
    backgroundColor: "#050505"
    textColor: "{colors.white}"
    rounded: "{rounded.panel}"
    padding: "16px 16px 13px"
    width: "336px"
  hud-slim:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.hud}"
    padding: "8px 8px 9px"
    width: "142px"
  hud-rail:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.hud}"
    padding: "10px 14px 12px"
    width: "320px"
  receipt:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "10px 12px 12px"
    width: "300px"
  device-panel:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.panel}"
    padding: "13px 14px 12px"
---

# Design System: Thinktype

## Overview

**Creative North Star: "The Field Instrument"**

A small, well-made measuring device on a workbench: anodised black, warm paper, one signal orange.
The instrument measures; the paper records. The interface should feel calibrated and legible, never
gamified, never glossy. The reference is Teenage Engineering's OP-1 field / TX-6 language — palette,
technical labelling, density and one signature move, not a costume of hardware controls.

The type is Vercel's Geist family. Geist Sans carries prose and UI; Geist Mono carries every number,
serial and label; Geist Pixel Square appears only in the T mark and display wordmark. The signature
move is the **receipt**: a sent prompt is printed as a paper record, and that same record is the share
card.

**Key Characteristics:**

- An anodised black instrument with a black LCD, living in the gutter of the host page. Hairlines,
  signal orange and the paper receipt carry the contrast; the live HUD is never a light card.
- One signal orange used for live state, data and interaction — not decoration.
- Mono numerals and technical labels; Sans prose; Pixel only as a mark.
- Hairline rules, tight corners, flat colour, one soft shadow on the floating instrument and its
  baseline rail.
- The printed receipt is the brand artifact and the share action. Documents are paper; instruments
  are ink.

## Colors

A warm paper/ink neutral field with a single synthetic orange. The orange is a signal, not a theme.

### Primary

- **Signal Orange** (`signal-orange`, #ff4d00): live state, meter bars, rules, active focus. On ink it
  meets 5.9:1; on paper it is for graphics only.
- **Signal Orange Display** (`signal-orange-display`, #e84a00): large orange numerals on paper, where
  the brighter signal orange would fall below the 3:1 large-text floor.
- **Signal Orange Ink** (`signal-orange-ink`, #b83600): small orange labels and values on paper
  (5.1:1).

### Neutral

- **Ink** (`ink`, #0b0b0a): device ground, primary text on paper.
- **Paper** (`paper`, #f2efe6): receipts, share cards and printed documents.
- **Paper Deep** (`paper-deep`, #e8e3d7): paper hover and inset fields.
- **White** (`white`, #f7f5ef): primary text on ink.
- **Muted Dark** (`muted-dark`, #9a9488): secondary text on ink (6.5:1).
- **Muted Paper** (`muted-paper`, #6d675c): secondary text on paper (4.9:1).
- **Line Dark** (`line-dark`, #2a2824): hairlines on ink.
- **Line Paper** (`line-paper`, #d5cfc1): hairlines and rules on paper.

### Named Rules

**The Paper/Device Rule.** Instruments are ink panels with paper text; paper is for things you print
or share. The live HUD, baseline rail, popup and options page are instruments, so they are anodised
black. The receipt and share cards are documents, so they are paper. Do not invert the instrument
shell to paper for fashion, and do not place a paper card inside a paper card without a hairline.

**The One Signal Rule.** Signal orange is reserved for live data, the meter, focus and primary
interaction. It never becomes a background wash, a gradient, or a second decorative accent.

**The Small Orange Rule.** On paper, small orange text uses Signal Orange Ink, display numerals use
Signal Orange Display, and the bright signal orange is reserved for graphics and ink fields.

## Typography

**Display Font:** Geist Mono (with ui-monospace, SF Mono, Menlo)
**Body Font:** Geist Sans (with system sans fallbacks)
**Label/Mono Font:** Geist Mono
**Wordmark:** Geist Pixel Square, display sizes only

**Character:** Swiss grotesk precision, tabular measurement, and one pixelated display accent. The
pairing is intentionally narrow: Sans explains, Mono measures, Pixel identifies. No serif, no second
display face.

### Hierarchy

- **Display** (500, 196px landscape receipt / 300px square / 380px story / 80px full HUD / 60px
  slim HUD, 0.78–0.9 line-height, −0.04em): WPM numerals and receipt headlines. Always tabular.
- **Headline** (600, 54px, 1.03, −0.035em): the demo hero only; never inside the product chrome.
- **Title** (500, 52px popup / 42px detail, 0.84–0.86, −0.04em): today's and session readouts.
- **Body** (400, 14px, 1.5, 65–75ch): settings prose, hints, detail notes.
- **Label** (600, 9–11px, 0.12–0.16em, uppercase): every technical label, serial, axis and footer.

### Named Rules

**The Mono Measures Rule.** Every number, unit, serial, timestamp and technical label is Geist Mono.
Prose is never mono; measurement is never proportional.

**The Pixel Is a Mark Rule.** Geist Pixel Square may draw the T mark or a wordmark at 18px or larger.
It never sets body copy, small labels, or numbers.

## Layout

Documents use a 900px maximum measure with 32px gutters. Settings are a two-column specification
sheet: a 160px margin for the section heading and a 620px content column separated by 40px. Sections
are divided by 1px hairlines, not cards.

The popup is a 380×600 black instrument report: a near-black device panel for today, a baseline
strip, a 14-day chart, then hairline session rows. The HUD is a tall anodised black instrument with a
black LCD display,
anchored to the bottom of the viewport and docked in the empty gutter beside the conversation. It
has a fixed 680px frame and three widths — 360px full, 286px medium, 142px slim — and collapses to a
draggable WPM orb (44–104px, resized from its corner grip) when collapsed or when no gutter fits. It
never covers the composer, send button or the last message. When the left gutter allows it, a
companion baseline rail shows LAST / BEST / AVG, a 14-day chart and the recent readings. The share
sheet lives inside the same dark frame; the receipt is a paper print inside it, with a serial,
barcode and a small NEW BEST stamp. Share cards are designed at 1200×630, 1080×1080 and 1080×1920,
with 64–84px margins and a cadence chart scaled to the format.

Spacing follows a 4/8/16/24/40 rhythm. More space above a heading than below it. Responsive:
settings stack at 760px and 520px; the HUD clamps to the viewport; the popup scrolls inside its max
height.

## Elevation & Depth

Paper is flat. Depth comes from hairlines, tonal fields and one floating object. The HUD is the only
surface with a shadow: `0 18px 44px -24px rgba(0,0,0,0.9)` plus a 1px line-dark border and a 1px
inner highlight. The receipt and all document surfaces are flat; the share card has no shadow.

**The Single Shadow Rule.** If it is not the floating HUD (or its collapsed orb), it does not cast a
shadow. No glass, no blur, no coloured halos.

## Shapes

Tight, physical corners: 2px for controls, 6px for the popup device, 12px for the floating HUD, 0 for
documents. The orb is the only circle. Borders are 1px; the signature orange rule is 6px. Pixel
blocks build the T mark. The receipt's perforation is a dashed 1px line — the only dashed rule in the
system.

**The Tight Corner Rule.** If a rectangle needs a 16px radius to feel friendly, the composition is
doing the work wrong. Radii stay under 12px except the orb.

## Components

### Buttons

- **Shape:** 2px radius; mono label at 8–9px, 600, 0.08–0.1em, uppercase.
- **Primary:** solid ink with paper text on paper surfaces; inverse on ink. Hover fills with Signal
  Orange and switches to ink text.
- **Ghost:** 1px line-strong border, transparent ground, text ink/paper. Hover fills solid.
- **Focus:** 1px Signal Orange outline, 2px offset; never removed.
- **Danger:** 1px Signal Orange Ink border and text; hover fills orange.

### Toggle

- **Shape:** 38×20px, 2px radius, square knob.
- **States:** off is a hairline track with an ink/paper knob; on is Signal Orange with an ink knob.
- **Focus:** 1px orange outline, 3px offset.

### Inputs and selects

- **Style:** 1px line-strong border, 2px radius, transparent/paper ground, mono values.
- **Focus:** 1px Signal Orange outline, 2px offset.
- **Range:** a 2px track with a 14px square orange thumb, 1px ink border.

### HUD

A tall anodised black instrument with a black LCD window, anchored to the bottom of the viewport in a
fixed 680px frame. Header with orange square, `THINKTYPE`, `TT-02`, a dock/reset control, collapse and
hide. The LCD holds a 120px mono live WPM (100px on medium, 72px on slim) with `WPM` and a state
label, a four-cell meta row (TIME / WORDS / SIGNAL / STEADY), a 38-bar cadence meter and a three-cell
FLOW / THINK / PEAK row. The dark baseline strip below shows BEST THINK, AVG THINK / 20, BEST FLOW,
AVG FLOW / 20, READINGS and DRAFTS. The footer carries the state and one short line.

When the left gutter is wide enough, a companion **baseline rail** docks opposite the HUD at the same
height: LAST / BEST / AVG in 54px numerals, a 14-day think WPM chart, BEST FLOW / AVG FLOW /
READINGS / DRAFTS, and the last four readings. It is a log tape, not a second dashboard.

The frame never changes size between idle, draft, typing, thinking, receipt and share. The receipt is
a paper card inside the dark frame; the share sheet is dark with a paper card preview. Only the
content changes.

States: `LIVE FLOW` while typing; `THINKING` with the live number held; `DRAFT / TYPE TO MEASURE`
when text already exists; `PAUSED` with frozen clocks for a manual pause; `PAUSED / NOT RECORDED` after
a reload; idle `LAST THINK` with LAST / BEST / AVG on the instrument. A dash, never a zero, means
no reading yet. The receipt state removes the LCD, prints down in five steps, and shows
think/flow/peak, words/time/signal, best and average, a serial, a barcode, a small **NEW BEST** stamp
and **SHARE CARD / DONE**.

A pause/play button sits in the header, with **Alt+Shift+P** as the shortcut. A manual pause is a
declared break: both clocks freeze, the display holds, and the paused time is excluded from the
session. Typing resumes automatically. The button is orange with a play glyph while paused, so the
state is readable at a glance. The share sheet
replaces the receipt with three format tabs, a live preview, the file name and PNG size, and
**COPY IMAGE / DOWNLOAD / BACK**.

**The Gutter Rule.** The HUD lives in the empty gutter beside the conversation, never over the
composer, send button or last message. Use the full 300px panel when the gutter allows it, the 232px
medium panel at narrow widths, and the 142px slim strip when only a slim column fits. If there is no
gutter on either side, it may use the sidebar area rather than cover the conversation; Reset HUD
position returns it to the dock.

**The Hold Rule.** A pause is not a reset. The live number holds in THINKING; only the cadence meter
dims. Never snap the big number to zero while the run is alive. The reading is updated only when a key
lands, not on the UI tick, so the clock cannot bleed it down.

**The Live Rule.** The big number is live flow, not think: the last eight seconds of active typing,
measured against the run's active age until that window fills. Thinking gaps are clamped to the idle
threshold; manual pauses are removed. Idle is `LAST THINK`, and the receipt's FLOW and PEAK are the
numbers to compare with a typing test.

**The Pause Rule.** Automatic THINKING still counts the pause as part of the run. A manual pause
freezes both clocks and excludes the break from the session. The pause button and `Alt+Shift+P` are
the only way to declare it; typing resumes automatically.

**The Baseline Rule.** Idle shows LAST / BEST / AVG, with dashes before the first reading. A slower
run never overwrites a best, and a resumed draft never enters the baseline.

### Receipt and share card

A paper record, never a dashboard. Each social format is designed at its own dimensions:

- **Landscape / OG (1200×630):** a 196px think number, orange 6px header rule, black
  thinking-overhead chip, 576px cadence chart, right column of flow/peak, best/average and a
  three-cell spec row, barcode and domain footer.
- **Square (1080×1080):** a 300px think number, full-width cadence chart, three big readings
  (flow/peak/best) and a second row of average/words/signal.
- **Story (1080×1920):** a 380px think number, 170px cadence chart, a black instrument block for
  flow/peak/best, a 2×3 baseline/spec grid, a pause note and the domain footer.

The card carries the serial, barcode, cadence bars, best/average and the current domain. Paste-
dominated or draft sessions say `PASTED / LOW SIGNAL` or `DRAFT RESUME` instead of hiding data. The
receipt and every format are drawn locally on canvas; no image model touches the text.

### Popup device panel

The darkest panel in the popup. It holds today's think/flow pair, the session count and a one-line
summary. Everything below it is the same black instrument shell with hairline dividers.

## Do's and Don'ts

### Do:

- **Do** keep instruments black and paper for receipts and share cards; use the 1px hairline as the main divider.
- **Do** set every number and technical label in Geist Mono with tabular numerals.
- **Do** use Signal Orange for live state, data, focus and one primary action.
- **Do** use Signal Orange Ink for small orange text on paper and Display for large numerals.
- **Do** keep the receipt's serial, barcode and dashed perforation; they are the signature.
- **Do** anchor the HUD to the bottom and keep it in the conversation's side gutter.
- **Do** keep the live HUD and baseline rail anodised black; paper is for receipts and documents.
- **Do** keep the HUD frame one fixed size across idle, draft, typing, thinking, receipt and share.
- **Do** hold the live number during THINKING and show LAST / BEST / AVG at idle.
- **Do** design each share format separately; the landscape, square and story are different
  compositions, not one stretched canvas.
- **Do** self-host Geist and preserve the OFL licence.

### Don't:

- **Don't** use gradients, glass, backdrop blur, neon glows or coloured halos.
- **Don't** add a second accent colour or reintroduce lime/violet.
- **Don't** set body copy or small labels in Geist Pixel.
- **Don't** put bright Signal Orange on paper for small text or display numerals.
- **Don't** use cards inside cards, section numbers, eyebrow labels or emoji icons.
- **Don't** animate everything; the receipt print and the two-step thinking blink are the only authored
  motions.
- **Don't** dock the HUD to the top-right, cover the composer or overlay the last message.
- **Don't** make the live HUD a light paper card on a dark host page.
- **Don't** resize the HUD frame between states.
- **Don't** reset the live number to zero on a pause, or overwrite a personal best with a lower run.
- **Don't** stretch a share card to a new aspect ratio; lay it out again.
