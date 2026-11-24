// Tiny DOM helpers. All dynamic text goes through text nodes and textContent, never through markup.
//
// Adapted from the Data Quality Agent 2.2.0 (831f050) js/dom.js: only h() and clear(), which this tool
// uses, and no option that writes markup as text, so the strict security policy holds without exceptions.

/**
 * Create an element.
 * attrs: class, text, dataset {}, style {} (CSSOM only, custom properties included), on {event: fn},
 * aria-* and any other attribute. children: strings (as text nodes), nodes, arrays, null and false
 * (skipped).
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") el.className = Array.isArray(v) ? v.filter(Boolean).join(" ") : v;
    else if (k === "text") el.textContent = keepTogether(v);
    else if (k === "dataset") Object.assign(el.dataset, v);
    else if (k === "style") for (const [prop, val] of Object.entries(v)) { if (prop.startsWith("--")) el.style.setProperty(prop, val); else el.style[prop] = val; }
    else if (k === "on") for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, String(v));
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(keepTogether(c)));
  }
}

/** A no-break space before "%" keeps "55 %" on one line wherever text is shown. */
function keepTogether(text) {
  return String(text).replace(/(\d) %/g, "$1 %");
}

/** Removes every child of an element and returns it. */
export function clear(el) {
  while (el && el.firstChild) el.removeChild(el.firstChild);
  return el;
}
