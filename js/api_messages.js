// The live client's errors in plain words, in the page's language (brief §5.8). js/anthropic.js stays the
// set's shared file, unchanged: where this tool shows one of its errors, this module maps the HTTP status,
// the error type and the API's message to an i18n key. Each message says what happened and one next step;
// the API's own message, in English, fills a placeholder only where no plain message fits.
//   401          the key was rejected
//   403, 404     the key may not use this model
//   400          no credit left ("credit balance is too low"), the spend limit the person set ("specified
//                API usage limits"), web search switched off for the organisation, or another refusal
//   429          too many requests, or a spend limit enforced as a rate limit
//   529          the service is busy
//   500 to 504   a fault at the service
//   0            the browser could not reach the API, or it did not answer in time
// Adapted from the Sovereignty Assessment 2.0.0 (35c0dea) js/api_messages.js: 400 for credit and for usage
// limits, 403 and 404 for a model the key may not use, and a next step with every message.

import { networkMessage, isWebSearchDisabled } from "./anthropic.js";
import { redactSecrets } from "./keystore.js";

const TIMED_OUT = networkMessage({ name: "AbortError" });

/** True for an account with no credit left. */
export const isCredit = (message) => /credit balance/i.test(message || "");
/** True for the spend limit a person set on their workspace or organisation. */
export const isUsageLimit = (message, details = null) => details?.error_code === "enforced_spend_limit_reached" || /usage limits|spend limit/i.test(message || "");

/**
 * The key and placeholders for a failed call: { status, type, message, details } as an ApiError carries
 * them, or { status, error: { type, message, details } } as checkKey() returns. Returns { key, vars }.
 */
export function apiMessage(e = {}) {
  const status = Number(e.status) || 0;
  const message = String(e.error?.message ?? e.message ?? e.detail ?? "").trim();
  const type = e.error?.type ?? e.type ?? "";
  const details = e.error?.details ?? e.details ?? null;
  if (!status) {
    if (type === "timeout_error" || message === TIMED_OUT || /within \d+ s|for \d+ s/.test(message)) return { key: "api.timeout", vars: null };
    return { key: "api.network", vars: null };
  }
  if (status === 401) return { key: "api.unauthorized", vars: null };
  if (status === 403 || status === 404) return { key: "api.model", vars: null };
  if (isCredit(message)) return { key: "api.credit", vars: null };
  if (isUsageLimit(message, details)) return { key: "api.usageLimit", vars: null };
  if (status === 400 && isWebSearchDisabled({ status, message })) return { key: "api.searchOff", vars: null };
  if (status === 429) return { key: "api.rateLimited", vars: null };
  if (status === 529 || type === "overloaded_error") return { key: "api.overloaded", vars: null };
  if (status >= 500) return { key: "api.server", vars: { status } };
  // The API's own words, with anything shaped like a key taken out.
  return { key: "api.other", vars: { status, message: redactSecrets(message || type || String(status)) } };
}

/** True when a failed request may run again after a wait (brief §5.8): never for credit or a spend limit. */
export function mayRetry(e) {
  if (!e || e.name === "AbortError") return false;
  if (isCredit(e.message) || isUsageLimit(e.message, e.details)) return false;
  return !!(e.retryable || e.type === "network_error");
}
