// Boot: the language first (js/lang.js has already set <html lang> and picked the guide), then every
// string in place and the EN | DE switch, the method dialog and the presenter with its recorded runs and the
// live run. Nothing here touches storage: js/i18n/index.js keeps the language choice, the
// only thing this tool remembers.

import { APP } from "./config.js";
import { initLang, applyStatic, setLang, getLang, onLang, t } from "./i18n/index.js";
import { initPresenter } from "./presenter.js";
import { initMethod, setSectorSource } from "./method.js";
import { scenarioById } from "./simulation.js";
import { guardLeaving, session } from "./session.js";

/** <html lang>, the pressed language button and the header button of the guide in this language. */
function drawLanguage() {
  const lang = getLang();
  document.documentElement.setAttribute("lang", lang === "de" ? "de" : "en-GB");
  document.documentElement.dataset.lang = lang;
  for (const b of document.querySelectorAll(".lang-option")) b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
  for (const b of document.querySelectorAll("[data-vc-guide-open]")) b.hidden = b.dataset.vcGuideOpen !== `guide-${lang}`;
}

/** EN | DE: every word switches in place, without a reload; the address keeps the choice for a shared link. */
function chooseLanguage(lang) {
  if (lang === getLang()) return;
  setLang(lang);
  const url = new URL(location.href);
  url.searchParams.set("lang", lang);
  history.replaceState(null, "", url);
  document.getElementById("announce").textContent = t("p.announce.lang");
}

function boot() {
  initLang();
  applyStatic();
  drawLanguage();
  for (const b of document.querySelectorAll(".lang-option")) b.addEventListener("click", () => chooseLanguage(b.dataset.lang));
  onLang(drawLanguage);
  const presenter = initPresenter();
  setSectorSource(() => (session().mode === "live" ? session().run?.company.sector || session().inputs.company.sector || "general" : scenarioById(presenter.state.scenarioId)?.company.sector ?? "general"));
  // The browser asks before the page is left while a live result exists that has not been downloaded.
  guardLeaving(window);
  initMethod();
  // For the browser suites: a copy of the live run as plain data, never the key, which lives elsewhere.
  window.__pestel = Object.freeze({
    mode: () => session().mode,
    run: () => {
      const r = session().run;
      return r ? JSON.parse(JSON.stringify({ ...r, unchecked: [...r.unchecked], recorded: [] })) : null;
    },
  });
  document.documentElement.dataset.ready = "true";
  console.info(`[${APP.name}] ${APP.version} ready.`);
}

boot();
