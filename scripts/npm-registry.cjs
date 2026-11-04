'use strict';
// Checks whether packages are published on the npm registry, for
// scripts/generate-catalog.js.
//
// Only a definitive answer from the registry may drop a pack from the catalog:
// an HTTP 404, or a document that says every version was unpublished. Anything
// else (network error, timeout, 429, 5xx, a body that isn't the expected JSON)
// is retried with backoff. If a pack still can't be checked, the whole check
// throws: the catalog must not ship a pack short because npm had a bad minute.

const REGISTRY = 'https://registry.npmjs.org';
const ATTEMPTS = 4; // 1 try + 3 retries
const BACKOFF_MS = [1000, 2000, 4000]; // wait before retry 1, 2, 3
const MAX_RETRY_AFTER_MS = 30000;
const TIMEOUT_MS = 10000;
const CONCURRENCY = 8;

class RegistryCheckError extends Error {
  constructor(failures) {
    super(
      `npm registry check failed for ${failures.length} pack(s):\n` +
        failures.map((f) => `  - ${f.name}: ${f.reason}`).join('\n'),
    );
    this.name = 'RegistryCheckError';
    this.failures = failures;
  }
}

const realSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Wait requested by a 429/503 Retry-After header (seconds or HTTP date), capped; null if absent. */
function retryAfterMs(res) {
  const header = res.headers?.get?.('retry-after');
  if (!header) return null;
  const seconds = Number(header);
  const ms = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header) - Date.now();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.min(ms, MAX_RETRY_AFTER_MS);
}

/**
 * One request. Returns { status: 'published' | 'absent', reason? } or
 * { status: 'retry', reason, waitMs? } — never throws.
 */
async function attempt(name, fetchImpl, timeoutMs) {
  let res;
  try {
    res = await fetchImpl(`${REGISTRY}/${encodeURIComponent(name)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const reason = err?.name === 'TimeoutError' ? `timed out after ${timeoutMs}ms` : `network error: ${err?.message ?? err}`;
    return { status: 'retry', reason };
  }

  if (res.status === 404) return { status: 'absent', reason: 'registry returned 404' };
  if (!res.ok) return { status: 'retry', reason: `HTTP ${res.status}`, waitMs: retryAfterMs(res) };

  let doc;
  try {
    doc = await res.json();
  } catch {
    return { status: 'retry', reason: 'response body is not valid JSON' };
  }
  if (doc?.['dist-tags']?.latest) return { status: 'published' };
  // A package whose versions were all unpublished keeps a stub document with
  // time.unpublished and no dist-tags. That's a real "not published" answer.
  if (doc?.time?.unpublished) return { status: 'absent', reason: 'every version was unpublished' };
  return { status: 'retry', reason: 'response has no dist-tags.latest' };
}

/**
 * Resolve one package. Returns { published: boolean, reason? }; throws
 * { name, reason } when it can't get a definitive answer after all attempts.
 */
async function checkPublished(name, { fetchImpl = globalThis.fetch, sleep = realSleep, timeoutMs = TIMEOUT_MS, log = console.warn } = {}) {
  let last;
  for (let i = 0; i < ATTEMPTS; i += 1) {
    last = await attempt(name, fetchImpl, timeoutMs);
    if (last.status === 'published') return { published: true };
    if (last.status === 'absent') return { published: false, reason: last.reason };
    if (i === ATTEMPTS - 1) break;
    const waitMs = last.waitMs ?? BACKOFF_MS[i];
    log(`  retrying ${name} in ${waitMs}ms (${last.reason})`);
    await sleep(waitMs);
  }
  throw { name, reason: `${last.reason} (after ${ATTEMPTS} attempts)` };
}

/**
 * Check every name. Returns Map<name, { published, reason? }>. Throws
 * RegistryCheckError listing every pack that couldn't be checked.
 */
async function checkAllPublished(names, opts = {}) {
  if (typeof (opts.fetchImpl ?? globalThis.fetch) !== 'function') {
    throw new RegistryCheckError(names.map((name) => ({ name, reason: 'global fetch is unavailable (needs Node 18+)' })));
  }
  const results = new Map();
  const failures = [];
  for (let i = 0; i < names.length; i += CONCURRENCY) {
    await Promise.all(
      names.slice(i, i + CONCURRENCY).map(async (name) => {
        try {
          results.set(name, await checkPublished(name, opts));
        } catch (failure) {
          failures.push(failure?.reason ? failure : { name, reason: String(failure) });
        }
      }),
    );
  }
  if (failures.length > 0) {
    failures.sort((a, b) => a.name.localeCompare(b.name));
    throw new RegistryCheckError(failures);
  }
  return results;
}

module.exports = { checkPublished, checkAllPublished, RegistryCheckError, ATTEMPTS };
