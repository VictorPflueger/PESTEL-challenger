# Design

The PESTEL Challenger is built on Vici, Victor's design system, as it stands at the commit `vici/README.md`
names. This file records the decisions Vici leaves to the tool.

## 1. Who looks at it, and where

A consulting partner shows it to a customer, often on a projector and without Victor, or someone tries it
on their own company. So the first screen says what the tool does and what the six forces are before
anything runs, every figure says what it rests on, and the page reads from the back of a room: never below
Vici's sizes, a little larger on a 1920 px projector.

## 2. The frame

It follows the Data Quality Agent and the Sovereignty Assessment, so a partner who has shown one knows
where to look:

- **The header:** the radar icon in a lilac hexagon and the name, SIMULATION, How it works, the theme
  toggle and EN | DE, then the four key figures. From 1,700 px wide the figures sit at the right of the
  header; below that they take a row of their own, so every name keeps its full text in both languages.
- **The strip under it:** the one sentence the brief gives (§8) and the byline.
- **The stage:** in 0.1.0, the first screen. From 0.2.0 the step bar with Play joins it, and the six
  dimensions around the company as hexagon cells, a Vici pattern this tool adds in M2.

## 3. The first screen in 0.1.0

A title, the lead sentence and a quiet note on what this version holds sit on the left. The six
dimensions stand on the right as one list read from top to bottom: each one's initial in a hexagon cell,
so the letters spell PESTEL, then its name and the question it asks (brief §6.1). The list is one object
with dividers, not six cards. The note is muted text under a rule rather than a coloured box, since it
explains the version and must not compete with the title.

## 4. Colour

Colour never carries meaning alone: each state also has a mark and a word.

| Colour | Means |
|---|---|
| Merlot (Vici's accent) | You: your turn, your choice, the pressed language |
| Lilac (Vici's feature colour) | The AI: what it wrote, suggested or estimated, and the AI notice |
| Coral, honey, sage | A dimension under pressure, one to watch, a factor responded to (from 0.2.0) |
| Ink | Everything else |

The page starts light (`data-vc-theme-default="light"` with Vici's `vici-theme.js`) until a visitor
chooses dark, because the rooms it is shown in are usually lit.

## 5. Two languages

English opens every first visit; German is one click away and switches every word in place, without a
reload. Each language has its own guide, as Vici's guide rule asks. German compounds are kept whole at a
line end where a break would strand a short part: "KI‑Agenten" and "Live‑Lauf" use a hyphen that does not break.

## 6. The shape brief for M1

- **Job and audience:** a partner opens the link cold; within ten seconds the page says what it does, what
  it will measure and what PESTEL means. Operate mode in Vici's world.
- **Outcome:** the frame is complete and honest. The four figures wait visibly ("…" and from which
  version), and the guide opens by itself with the talk track.
- **Direction:** Vici as it is; the sisters' frame; the PESTEL list as the one picture of 0.1.0. The
  hexagon of six around the company is M2's centrepiece, built once, as a Vici pattern.
- **Constraints:** a strict security policy, both themes, English and German without a reload, 1920 × 1080
  and 1280 × 720 without scrolling, no text cut to an ellipsis, targets of at least 40 px.
