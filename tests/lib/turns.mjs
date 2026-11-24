// The stand-in's answers: what each agent would answer in a live run on scenario S3's company, in one
// language, built from the recorded scenario so the live path and the simulation can be compared. The form
// a test fills holds S3's company and the team's three factors in entry order, so the live ids (u1, u2, u3)
// are S3's and its answers fit: the Scanner rates the team's factors as the team did, and the Red team, the
// Analyst, the Strategist and the Writer answer as recorded. Faults are planted on top by the suites.
import { scenarioById, localise } from "../../js/simulation.js";

/** The form a live test fills: S3's company and its team's factors, in one language. */
export function formOf(id = "s3", lang = "en", { sector = true } = {}) {
  const sc = scenarioById(id);
  const texts = sc.texts[lang];
  return {
    company: { name: sc.company.name, sector: sector ? sc.company.sector : "", country: texts.country, what: texts.what },
    factors: sc.team.map((t) => ({ dimension: t.dimension, text: localise(t.text, lang) })),
  };
}

/** Each agent's answer, as the API would return it in a text block (the Scout's through submit_signals). */
export function answersOf(id = "s3", lang = "en", { sector = true } = {}) {
  const sc = scenarioById(id);
  const a = localise(sc.answers, lang);
  const team = localise(sc.team, lang);
  return {
    scout: a.scout ? { signals: a.scout.signals.map(({ read_on, ...s }) => s) } : { signals: [] },
    scanner: {
      sector: sector ? null : sc.company.sector,
      factors: a.scanner.factors,
      ratings: team.map((t) => ({ factor: t.id, ...t.rated, confidence: "medium", basis: lang === "de" ? "So hat das Team es eingeschätzt." : "As the team rated it." })),
    },
    red_team: { issues: a.red_team.issues },
    analyst: { impacts: a.analyst.impacts },
    strategist: { responses: a.strategist.responses },
    writer: { summary: a.writer.summary },
  };
}

/** The search results the Scout's first request returns: one result for each signal's address. */
export function searchResultsOf(id = "s3", lang = "en") {
  const sc = scenarioById(id);
  return localise(sc.answers.scout?.signals ?? [], lang).map((s) => ({ url: s.url, title: s.title, page_age: s.published ? `${s.published}` : null }));
}

/** Which agent a request is for, from its system prompt. */
export function agentOf(body) {
  const m = String(body?.system || "").match(/You are the (Scout|Scanner|Red team|Analyst|Strategist|Writer)\./);
  return m ? { Scout: "scout", Scanner: "scanner", "Red team": "red_team", Analyst: "analyst", Strategist: "strategist", Writer: "writer" }[m[1]] : null;
}
