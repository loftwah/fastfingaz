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
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.hud}"
    padding: "10px 12px 12px"
    width: "420px"
  hud-display:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.panel}"
    padding: "12px 14px 10px"
    width: "396px"
  receipt:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "10px 12px 12px"
    width: "420px"
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

- Paper documents and a black LCD window, never a dark page floating on a dark page.
- One signal orange used for live state, data and interaction — not decoration.
- Mono numerals and technical labels; Sans prose; Pixel only as a mark.
- Hairline rules, tight corners, flat colour, one soft shadow on the floating device.
- The printed receipt is the brand artifact and the share action.

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
- **Paper** (`paper`, #f2efe6): documents, receipts, popup/options ground.
- **Paper Deep** (`paper-deep`, #e8e3d7): paper hover and inset fields.
- **White** (`white`, #f7f5ef): primary text on ink.
- **Muted Dark** (`muted-dark`, #9a9488): secondary text on ink (6.5:1).
- **Muted Paper** (`muted-paper`, #6d675c): secondary text on paper (4.9:1).
- **Line Dark** (`line-dark`, #2a2824): hairlines on ink.
- **Line Paper** (`line-paper`, #d5cfc1): hairlines and rules on paper.

### Named Rules

**The Paper/Device Rule.** Documents are paper with ink text; instruments are ink panels with paper
text. Do not invert them for fashion, and do not place a paper card inside a paper card without a
hairline.

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

- **Display** (500, 196px on the receipt / 64px in the HUD, 0.8–0.86 line-height, −0.04em):
  WPM numerals and receipt headlines. Always tabular.
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

The popup is a 380×600 document: a black device panel for today, then a 14-day chart, then hairline
session rows. The HUD is a fixed 420px paper instrument with a black LCD display, docked beside the
composer (right of it when there is room, above it otherwise) and collapsible to a 60px orb. The share receipt is 1200×630 with 64px margins, a 576px cadence chart, and a right column of
flow/peak plus a three-row spec table.

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

420px paper housing around a black LCD window. Header with orange square, `THINKTYPE`, `TT-01`,
collapse and hide. 64px mono live WPM in the LCD with `WPM` and a state label, plus timer and words.
A 38-bar, 40px cadence meter: 55% history opacity, newest nine at full. Footer on paper with the state
and `THINK 63 / FLOW 78`. When a draft already exists, the LCD says `DRAFT / TYPE TO MEASURE` and
starts measuring on the next keystroke. The receipt state removes the LCD, prints down in five steps,
and shows think/flow/words, serial, time/signal, barcode and **COPY RECEIPT**.

### Receipt and share card

A paper record, never a dashboard. The share card uses a 196px think number, an orange 6px header rule,
a black thinking-overhead block, orange cadence bars, flow/peak on the right, three spec rows, a
barcode and a dashed footer. Paste-dominated sessions say `PASTED / LOW SIGNAL` instead of hiding
data.

### Popup device panel

The only black panel in the popup. It holds today's think/flow pair, the session count and a one-line
summary. Everything below it is a paper document.

## Do's and Don'ts

### Do:

- **Do** keep documents paper and instruments ink; use the 1px hairline as the main divider.
- **Do** set every number and technical label in Geist Mono with tabular numerals.
- **Do** use Signal Orange for live state, data, focus and one primary action.
- **Do** use Signal Orange Ink for small orange text on paper and Display for large numerals.
- **Do** keep the receipt's serial, barcode and dashed perforation; they are the signature.
- **Do** self-host Geist and preserve the OFL licence.

### Don't:

- **Don't** use gradients, glass, backdrop blur, neon glows or coloured halos.
- **Don't** add a second accent colour or reintroduce lime/violet.
- **Don't** set body copy or small labels in Geist Pixel.
- **Don't** put bright Signal Orange on paper for small text or display numerals.
- **Don't** use cards inside cards, section numbers, eyebrow labels or emoji icons.
- **Don't** animate everything; the receipt print and the two-step thinking blink are the only authored
  motions.
