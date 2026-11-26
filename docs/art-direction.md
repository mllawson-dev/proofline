# Proofline art direction — "Press Check"

A print shop's proofing table: paper-white stock, ink-black type, and the four process inks used only to say **who owns a job's next move**. Color always means something; nothing is decorative except the registration mark.

**Brand profile.** Controlled energy, cool-neutral temperature, working-floor formality (plain, fast, legible). Dense: staff scan 30–40 jobs at once. Audience: counter staff, designers, production crew, a shop manager, and customers approving proofs on their phones. *It should feel like a well-run shop's job ticket, not a startup dashboard.* Off-brand: gradient SaaS cards, rainbow status colors, playful illustration, dark-mode-by-default "pro tool" styling.

```
DESIGN TOKENS — Proofline · Press Check
Lens mix: palette from Swiss Precision (white, black, one signal) extended with process inks as a
          meaningful status system — rigor for a data tool; type energy from Americana Utility
          (condensed headers, like ticket and plate stamping) — trade heritage; composition from
          Swiss Precision (flush-left grid, rules not shadows) — density without clutter.

Type
  Display:  Archivo Variable, 700, width 78% (condensed), tracking -0.005em, sentence case, lh 1.15
  Body:     IBM Plex Sans 400/500/600, lh 1.5, tabular figures everywhere
  Mono:     IBM Plex Mono 400 for job numbers and specs
  Scale:    h1 28–36px / h2 22px / h3 17px / body 15px / small 13px / label 12px uppercase 600 +0.06em
Color
  --paper  #F6F5F1  app background        --sheet  #FFFFFF  cards, tables
  --ink    #16181D  text, rail             --ink-muted #5B6069 secondary text
  --rule   #D9D7D0  dividers only          --control-edge #8A8F98 input/button borders
  --accent #B3124F  primary action, focus  --late #A3261F past-due
  Owner inks (strong / tint): counter #5B6069/#E8E6DF · design #9C2367/#F6D3E4 ·
    customer #7A5B00/#FFE27A · production #0A6F8C/#CDEAF3 · done #1D6B3A/#D3EBDB · late tint #F7D9D6
  Contrast pairs verified (WCAG 2.2):
    ink on paper 16.3 · ink on sheet 17.8 · muted on paper 5.8 · muted on sheet 6.3
    white on accent 6.7 · accent on sheet 6.7 · late on sheet 7.4 · late on paper 6.7
    rail text #E8E6DF on ink 14.2 · ink on every tint 13.0–14.2
    control edge on sheet 3.25 (non-text, ≥3:1)
Space
  4px base: 4 / 8 / 12 / 16 / 24 / 32 / 48. Tables and lists are dense (48px rows);
  page headers and empty states breathe (32–48px).
Shape
  Radius 3px controls, 6px panels, 999px chips only. 1px rules. No drop shadows: layering by edge.
Motion
  120ms / 200ms, cubic-bezier(0.2, 0, 0, 1). Only state changes animate (hover, pressed, drag).
  Nothing loops. Reduced motion → 0ms.
Layout
  Desktop: dark ink rail (15rem) + paper workspace. Phone: rail becomes a top bar; tables become
  stacked cards with labels; view tabs scroll sideways.
Imagery
  Real proofs and product photos of signs only. No stock people, no illustration.
Avoid
  Color-only status · gradient cards · centered layouts · Inter/Roboto defaults doing display work ·
  shadows for hierarchy · decorative charts · "AI dashboard" dark-mode glow
```
