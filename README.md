# PESTEL Challenger

AI agents complete a PESTEL analysis, challenge it, put a figure on each outside force and propose what to do or watch.

<https://victorpflueger.github.io/PESTEL-challenger/>

Version 0.2.0 plays three recorded runs on fictional companies, in English and German and without a key:
a shipping line, a maker of industrial drives and a municipal utility. Each walks through six steps, from
the team's own list to a management summary with a watch list, and the key figures show what is at stake
before anything plays. A live run on your own Claude key follows in 0.3.0, and the report as a PDF in
0.4.0. [PLAN.md](PLAN.md) holds the plan; [DEMO_SCRIPT.md](DEMO_SCRIPT.md) and
[DEMO_SCRIPT.de.md](DEMO_SCRIPT.de.md) show it in five minutes.

## What it will do

A person names a company and lists the outside forces they see under six headings: political, economic,
social, technological, environmental and legal. AI agents complete and rate them, challenge the analysis
and mark the dimensions under pressure. They put a figure on each threat with the KPIs of the company's
sector, propose how to mitigate it, turn it into an advantage or watch it, and write a management summary
with a watch list. The report downloads as a PDF, an HTML file and a JSON file for the Prototype Ideator.

## What is real and what is simulated

The simulation plays three fictional companies without a key. Their own figures are invented and
illustrative; what they say about the world, such as a law or a price, is real and shows its source and
the date it was read ([DATA_SOURCES.md](DATA_SOURCES.md)). The agents' answers were recorded in the
formats a live run uses and pass the same checks; the engine works out every figure from them as the
scenario plays, so a choice other than the recorded one still gives figures that agree.

A live run uses your company and your own Claude API key. You choose the model, the effort and a budget
cap. The key and everything you enter stay in the tab's memory and are gone when you close or reload it;
you keep a result only by downloading it.

Public information only: never enter confidential, personal or otherwise protected data.

Code computes every score and total. Readiness is this tool's own measure, not part of PESTEL.

## Running it

It is a static page: serve the folder with any web server, such as `python3 -m http.server`, and open it.
Press Play, or use the arrow keys or a clicker; `?scenario=s1&step=4` opens a scenario at a step. The
tests and how to run them are in [TECH_NOTES.md](TECH_NOTES.md) section 7.

## Part of a set of four

- [Business Model Canvas Challenger](https://github.com/VictorPflueger/BMC-challenger)
- [SWOT Challenger](https://github.com/VictorPflueger/SWOT-challenger)
- PESTEL Challenger, this repository
- [Prototype Ideator](https://github.com/VictorPflueger/PrototypeIdeator), which turns the three challengers' reports into prototype ideas

Built by Victor Pflüger: [LinkedIn](https://www.linkedin.com/in/victorpflueger), [website](https://victorpflueger.github.io/VIP/index.html).
