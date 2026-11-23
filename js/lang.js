/* Picks the page's language before vici.js starts: ?lang=de or ?lang=en in the address, else the
 * visitor's last choice (stored under "pestel.lang", as js/i18n/index.js reads it), else English. A German
 * browser's first visit opens in English too. The page carries one How it works guide per language: this
 * script leaves data-vc-guide-auto only on the guide in the page's language, so that is the one vici.js
 * opens by itself, shows only that guide's header button, and presses that language's button. A plain script at the end of the body, not
 * deferred: it has to run after the guides are parsed and before vici.js, which is deferred.
 * Adapted from the Sovereignty Assessment 2.0.0: the storage key, and no boot screen.
 */
(function () {
  "use strict";
  var lang = "en";
  try {
    var asked = new URLSearchParams(window.location.search).get("lang");
    if (asked === "de" || asked === "en") lang = asked;
    else if (window.localStorage.getItem("pestel.lang") === "de") lang = "de";
  } catch (e) {
    /* no URLSearchParams or storage is blocked: English */
  }
  var root = document.documentElement;
  root.setAttribute("lang", lang === "de" ? "de" : "en-GB");
  root.setAttribute("data-lang", lang);
  // The language switch shows the right language pressed from the first paint; js/main.js keeps it so.
  var options = document.querySelectorAll(".lang-option[data-lang]");
  for (var i = 0; i < options.length; i++) options[i].setAttribute("aria-pressed", String(options[i].getAttribute("data-lang") === lang));
  ["en", "de"].forEach(function (l) {
    var guide = document.getElementById("guide-" + l);
    if (guide && l !== lang) guide.removeAttribute("data-vc-guide-auto");
    var opener = document.querySelector('[data-vc-guide-open="guide-' + l + '"]');
    if (opener) opener.hidden = l !== lang;
  });
  // vici.js opens a guide by itself once per browser tab and notes that per guide, under
  // "vc-guide:<path>#<id>". The two guides are one guide in two languages: once either has opened in this
  // tab, a reload in the other language doesn't open it again.
  try {
    var seen = function (l) { return "vc-guide:" + window.location.pathname + "#guide-" + l; };
    if (window.sessionStorage.getItem(seen(lang === "de" ? "en" : "de"))) window.sessionStorage.setItem(seen(lang), "1");
  } catch (e) {
    /* storage blocked: vici.js opens the guide, as it does without storage */
  }
})();
