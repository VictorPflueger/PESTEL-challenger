# Design

The PESTEL Challenger is built on Vici, Victor's design system, at the commit `vici/README.md` names.
This file records the decisions Vici leaves to the tool.

## 1. Who looks at it, and where

A consulting partner shows it to a customer on a projector, often without Victor, or someone tries it on
their company. So the first screen says what the tool does, every figure says what it rests on, and
the page reads from the back of a room.

## 2. The frame

It follows the Data Quality Agent, so a partner who has shown one knows where to look:

- **The header:** the radar icon in a lilac hexagon, the name, the actions under it (SIMULATION, Method,
  How it works, theme, EN | DE) and the four key figures at the top right, on a row of their own below
  1,900 px.
- **The strip under it:** the brief's one sentence (§8) and the byline.
- **The step bar:** Play, Back, the six steps as Vici's stepper, and Next; a step where the person acts
  says so.
- **The stage:** the story on the left (title, lead sentence, the step's panel and the "Your turn" bar),
  the ring of six dimensions on the right.

## 3. The steps

Each step answers one question in its title; Play stops where the person acts.

| Step | Left: the story | Right |
|---|---|---|
| Start | The scenarios as a segmented choice, "Fictional company, illustrative figures", the team's list, "Your turn" | The ring: the company amid its six dimensions |
| Scan | The dated signals, or the note on the model's June 2026 cutoff; what the agents added, in lilac | The ring with counts and states; the chosen dimension's factors |
| Challenge | One card per issue, its correction in words and an Undo | The ring turns coral where a dimension comes under pressure |
| Assess | The whole stage: risk matrix, horizon strip and the three largest threats, tables one click away | |
| Respond | The whole stage: each factor's options as cards, the recommended one chosen | |
| Summary | The summary with figures filled in by code, the chosen responses and the watch list | The ring with what was addressed |

The key figures show the analysis before anything plays; the decision strikes the old value through
beside the new one.

A live run uses the same steps. Start is an empty form under the public-information notice; "Start the
agents" opens Vici's live-run dialog. While an agent works, its step shows its role, the time, the spend
against the cap and Abort, and each key figure says what it waits for. A stop says why and keeps what is
done. At Scan the person keeps, edits or removes each AI factor.

## 4. Colour

Colour never carries meaning alone: each state also has a mark and a word.

| Colour | Means |
|---|---|
| Merlot (Vici's accent) | You: your turn, your choice, the pressed language |
| Lilac (Vici's feature colour) | The AI: what it wrote, suggested or estimated, and the AI notice |
| Coral, honey, sage | A dimension under pressure, one to watch, a factor responded to |
| Ink | Everything else |

The page starts light until a visitor chooses dark: rooms are lit.

## 5. Two languages

English opens every first visit; German switches every word in place, and has its own guide.
"KI‑Agenten" and "Live‑Lauf" use a hyphen that does not break.

## 6. The shape of M3

- **Job:** someone runs the agents on their own company and key, alone. Operate mode.
- **Outcome:** a live run reaches the summary within its cap, or stops, says why and keeps what is done.
- **Direction:** Vici as it is, with the SWOT Challenger's live-run dialog and the ring and horizon strip
  this tool added first.
- **Constraints:** the strict security policy, the key in memory only, both themes and languages,
  1920 × 1080 and 1280 × 720 without page scroll, no text cut, targets of at least 40 px, nothing round.
