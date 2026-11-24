# Design

The PESTEL Challenger is built on Vici, Victor's design system, at the commit `vici/README.md` names.
This file records the decisions Vici leaves to the tool.

## 1. Who looks at it, and where

A consulting partner shows it to a customer on a projector, often without Victor, or someone tries it on
their own company. So the first screen says what the tool does before anything runs, every figure says
what it rests on, and the page reads from the back of a room.

## 2. The frame

It follows the Data Quality Agent, so a partner who has shown one knows where to look:

- **The header:** the radar icon in a lilac hexagon with the name, the actions under them (SIMULATION,
  Method, How it works, theme, EN | DE) and the four key figures at the top right. Below 1,900 px the
  figures get their own row; on a laptop too, actions and values keep one line.
- **The strip under it:** the brief's one sentence (§8) and the byline.
- **The step bar:** Play, Back, the six steps as Vici's stepper, then Next. A step where the person acts
  says so on its marker.
- **The stage:** the story on the left (title, one lead sentence, the step's panel and the "Your turn"
  bar), the six dimensions around the company on the right.

## 3. The steps

Each step answers one question in its title; Play walks the steps and stops where the person acts.

| Step | Left: the story | Right |
|---|---|---|
| Start | The scenarios as a segmented choice, "Fictional company, illustrative figures", the team's list, "Your turn" | The ring: the company in the centre, the six dimensions around it |
| Scan | The dated signals, or the note that the model's knowledge ends in June 2026; what the agents added, in lilac | The ring with counts and states; the chosen dimension's factors |
| Challenge | One card per issue, its correction in words and an Undo | The ring turns coral where a dimension comes under pressure |
| Assess | The whole stage: the risk matrix, the horizon strip and the three threats that put most at stake, with tables one click away | |
| Respond | The whole stage: each factor's options as cards, the recommended one chosen, the threats under pressure first | |
| Summary | The summary with figures filled in by code, the chosen responses and the watch list | The ring with what was addressed |

At Respond every option of the factor in view shows above the bar at 1280 × 720. The key figures show the
analysis before anything plays; the decision strikes the old value through beside the new one.

## 4. Colour

Colour never carries meaning alone: each state also has a mark and a word.

| Colour | Means |
|---|---|
| Merlot (Vici's accent) | You: your turn, your choice, the pressed language |
| Lilac (Vici's feature colour) | The AI: what it wrote, suggested or estimated, and the AI notice |
| Coral, honey, sage | A dimension under pressure, one to watch, a factor responded to |
| Ink | Everything else |

The page starts light (`data-vc-theme-default="light"`) until a visitor chooses dark: rooms are lit.

## 5. Two languages

English opens every first visit; German switches every word in place. Each language has its own guide.
"KI‑Agenten" and "Live‑Lauf" use a hyphen that does not break.

## 6. The shape of M2

- **Job:** a partner presents one company in five minutes, or a visitor plays it alone. Operate mode.
- **Outcome:** a scenario plays without a key; the decision moves the key figures, and any other choice
  gives figures that agree.
- **Direction:** Vici as it is, with the framework view and the risk matrix from the sister tools, and the
  ring and the horizon strip, which this tool added to Vici first.
- **Constraints:** the strict security policy, both themes and languages, 1920 × 1080 and 1280 × 720
  without page scroll, no text cut, targets of at least 40 px, and nothing round.
