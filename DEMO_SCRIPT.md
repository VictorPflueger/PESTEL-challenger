# Demo script: five minutes

Auental Energie, the default scenario: a fictional municipal utility that also runs the town's
waterworks. Every figure below is the engine's, and the guide's talk track quotes the same ones.

## Before you start

- Open the live site in a fresh tab, full screen, at 1920 × 1080 or 1280 × 720. *How it works* opens by
  itself; `?guide=present` opens it straight on the talk track.
- Close the guide with **Start**. Press **Play**, or use the right arrow or a clicker: each step stays as
  long as its words take to read, and Play stops wherever you act. Space pauses while you talk.
- No key is needed, and the simulation works offline.

## The five minutes

| Time | Step | Say | Do and watch |
| --- | --- | --- | --- |
| 1 min | Point at the key figures | "Before anything runs, the engine has done the sums: €3.8m at stake a year, readiness 51, three of six dimensions under pressure." | Point at the four tiles, then at the team's list: three outside forces, rated by the team. |
| 1 min | Start the agents, then open a dated signal | "The Scanner fills all six dimensions from the news, each with its source." | Click **Start the agents**. Open the seven signals and one of the nine factors in lilac: its basis, its source and the date it was read. |
| 1 min | Challenge, then open Legal | "The Red team moves the heat plan to now, and legal comes under pressure." | Click **Challenge this analysis**. Five cards, each with its reason and an Undo. Click *Legal* in the ring: the heat plan is due by 31 December 2026, not in one to three years. Press Next: the risk matrix puts gas prices at number one. |
| 1.5 min | At Respond, change one choice | "Mitigate the heat plan, watch overdue bills. Each choice moves the figures." | Press Next. The recommended responses are chosen. Switch gas prices to **Watch it**: the bar shows €2.9m and readiness 66. Switch back to the hedge, then click **Adopt these responses**. |
| 0.5 min | Adopt, then show the watch list | "Left at stake: €2.2m a year, readiness 72." | The tiles strike €3.8m, 51 and three of six through. Scroll to the watch list: four signals, each with its trigger and how often to look. |

## If something goes wrong

- **A wrong click.** Every correction of the Red team has an Undo. A choice changed after adopting opens
  the decision again; adopt once more.
- **Lost on the way.** `?scenario=s3&step=4` opens the decision, `step=5` the summary with the
  recommended responses adopted.
- **A small projector.** The page fits 1280 × 720. Lower the resolution rather than zoom in.

## Questions that will come

**Is this real?** Auental Energie and its own figures are invented. What it says about the world is
real and dated: the Building Modernisation Act of 10 July 2026, Dutch gas above €100/MWh during trading
on 28 October 2026, the heat plan deadline in Lower Saxony. DATA_SOURCES.md lists every source.

**Where do the figures come from?** From code. The agents rate each factor and estimate a euro range; the
engine works out every key figure, and a fact audit refuses any figure in the agents' words.

**What is readiness?** This tool's own measure, 0 to 100: how much of its threats' weight the company is
ready for. The **Method** dialog shows the rule and a worked example.

**What does a run cost?** About €0.05 on the Balanced setting and €0.24 on Thorough, both estimated. A
live run on your own company and Claude key follows in version 0.3.0, with a budget cap you set.

## After the demo

- Send the link with `?guide=present`: the talk track lets people replay it alone.
- Show another company if there is time: `?scenario=s1` is a container line with research,
  `?scenario=s2` a maker of drives without research, which says where the model's knowledge ends.
