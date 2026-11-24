# PESTEL Challenger

AI agents complete a PESTEL analysis, challenge it, put a figure on each outside force and propose what to do or watch.

<https://victorpflueger.github.io/PESTEL-challenger/>

Version 0.3.0 runs the agents live on your own company with your own Claude API key. Without a key it
plays three recorded runs on fictional companies, in English and German: a shipping line, a maker of
industrial drives and a municipal utility. Each walks through six steps, from the team's own list to a
management summary with a watch list, and the key figures show what is at stake before anything plays.
The report as a PDF, an HTML file and a JSON file follows in 0.4.0. [PLAN.md](PLAN.md) holds the plan;
[DEMO_SCRIPT.md](DEMO_SCRIPT.md) and [DEMO_SCRIPT.de.md](DEMO_SCRIPT.de.md) show it in five minutes.

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

A live run uses your company and your own Claude API key. The agents answer anew each time; code checks
every answer before the next step reads it and works out every figure from them. The key and everything
you enter stay in the tab's memory and are gone when you close or reload it; you keep a result only by
downloading it.

Public information only: never enter confidential, personal or otherwise protected data.

Code computes every score and total. Readiness is this tool's own measure, not part of PESTEL.

## A live run

"Run it live" opens an empty form: the company, its sector, its country, one line on what it does and the
outside forces you see under the six headings. "Start the agents" opens a dialog where you enter the key,
choose the setting, set a budget cap and confirm that you entered public information only.

What you enter, and what the agents have written so far, goes to Anthropic's API at api.anthropic.com,
under your key and its terms; the page talks to no other host. You need a key from the Claude Console,
best in a workspace of its own with a monthly spend limit. A Claude plan does not pay for this by itself:
Max, Ultra and Team plans include monthly API credits once you link a Console organisation; Free, Pro and
Enterprise plans do not.

Fast runs Haiku 5.5 at low effort without thinking; Balanced, the default, runs it at medium effort;
Thorough runs Sonnet 5.5 at medium effort, at about twenty times the cost. Advanced sets the model and
the effort apart. Research is off until you switch it on. Then a Scout makes up to five web searches
first, at $10 per 1,000 searches plus the tokens of what they find, and every signal shows its address
and the date it was read. Without research the run says once that the models know the world only up to
June 2026.

The cap is €0.50 unless you change it, anywhere from €0.05 to €3. No request starts whose worst case
could take the run past it, and the meter adds up what each answer cost from the API's own token counts
at list prices. A run sends at most ten requests. When the API refuses one, the page says why in plain
words and what to do next, and tries twice more where that can help, never for missing credit or a
spend limit. A run that stops, at the cap, on an error, after an answer failed its checks twice or
because you aborted it, keeps what is done, and you can go on from there. After a run, "Save run as
simulation" downloads it in the format the simulation plays, without your key.

## Running it

It is a static page: serve the folder with any web server, such as `python3 -m http.server`, and open it.
Press Play, or use the arrow keys or a clicker; `?scenario=s1&step=4` opens a scenario at a step. A live
run has no address, so a reload ends it. The tests, which never call the real API, and how to run them
are in [TECH_NOTES.md](TECH_NOTES.md) section 7.

## Part of a set of four

- [Business Model Canvas Challenger](https://github.com/VictorPflueger/BMC-challenger)
- [SWOT Challenger](https://github.com/VictorPflueger/SWOT-challenger)
- PESTEL Challenger, this repository
- [Prototype Ideator](https://github.com/VictorPflueger/PrototypeIdeator), which turns the three challengers' reports into prototype ideas

Built by Victor Pflüger: [LinkedIn](https://www.linkedin.com/in/victorpflueger), [website](https://victorpflueger.github.io/VIP/index.html).
