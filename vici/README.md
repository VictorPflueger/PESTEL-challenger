# Vici, copied into this tool

These files come unchanged from Vici, Victor Pflüger's design system
(<https://victorpflueger.github.io/ViciDesign/index.html>), from its main branch at commit **`3b58694`**
(`3b586948021ac867bdd8f0e3ca8d12d7676c7349`, 24 November 2026), version v1.0.0 on the way to Vici 2.0.
That commit holds the two patterns this tool added to Vici first, the rule that nothing a person enters
is kept (ViciDesign#24) and the blank starter under a strict security policy with `vici-theme.js`
(ViciDesign#25), the framework view and the risk matrix the SWOT Challenger added (ViciDesign#26 and #27), the
Business Model Canvas Challenger's block states and risk-matrix markers sized by what is at stake
(ViciDesign#28 and #29), and the ring of six cells around a centre, the horizon strip and the segmented
control's square radios this tool added for version 0.2.0 (ViciDesign#30, #31 and #33), the fix that keeps the
risk matrix and the horizon strip to their own width once their numbers open (ViciDesign#34), the live-run dialog
the SWOT Challenger added (ViciDesign#36), which this tool's live run opens, the Prototype Ideator's callouts that
keep their text and their actions in their own ink, tables that set tabular figures in number cells only and the
live-run dialog fitting 1280 × 720 (ViciDesign#35, #37, #38 and #39), its drop zone (ViciDesign#32), which this
tool does not use, the report this tool added for version 0.4.0, whose pages print with the footer on every
page and leave as an HTML file of their own (ViciDesign#40), the live-run dialog fitting every window from
1280 × 720 to 1920 × 1080 (ViciDesign#41, from the SWOT Challenger), and this tool's fixes for version 1.0.0:
reduced motion stills a dialog's backdrop, a dialog's scrolling body shows its focus ring all round
(ViciDesign#42), in the dark theme a report's sheets lie on the page's own background (ViciDesign#44), and
every target takes at least 40 px (ViciDesign#47); with them the SWOT Challenger's report that prints in the
light scheme (ViciDesign#46) and the Prototype Ideator's honeycomb that starts at its edge (ViciDesign#45).
The tool loads these files from here
rather than from a CDN, so every page is served from this site alone.

| File here | What it is |
|---|---|
| `dist/vici.min.css` | Vici's stylesheet: tokens, light and dark theme, components, icons |
| `dist/vici.js` | Vici's small script: theme toggle, tooltips, the guide, printing a report alone and the behaviours of its components |
| `dist/vici-theme.js` | Applies the remembered theme before the first paint, without an inline script |
| `dist/tokens.json` | Vici's token values, light and dark, for scripts and tests (the colour checks read it) |
| `assets/fonts/*.woff2` | Bricolage Grotesque, Inter, JetBrains Mono and Vici Mask, as the stylesheet expects them |
| `assets/fonts/OFL-*.txt` | The SIL Open Font License of each font family |
| `assets/marks/linkedin.png` | LinkedIn's [in] logo, as LinkedIn publishes it |
| `assets/marks/README.md` | Where the marks come from and how they may be used (it also names marks this copy leaves out) |
| `assets/brand/portrait-96.jpg` | Victor's portrait, 96 × 96 px, for the byline |
| `LICENSE` | Vici's licence |

Keep the folder structure: the stylesheet finds the fonts at `../assets/fonts/`. Never edit these
files; a fix belongs in Vici and comes here with its next commit.

**Licence.** `LICENSE` covers all of it: Vici's code and its Vici Mask font are MIT-licensed;
Bricolage Grotesque, Inter and JetBrains Mono are under the SIL Open Font License; Victor Pflüger's
name, portrait and logo are reserved for his own use; LinkedIn's logo belongs to LinkedIn.

**Updating.** Copy the same files from a newer Vici main (its `dist/` and `assets/` folders, and
`LICENSE`) over these, and change the commit above and the one the tests workflow checks out.
`tests/vici-files.mjs` then compares every file with that commit. Run the tests and look at the tool in
light and dark: a new commit may rename a class or change a token.
