// api/meta-capi-lead.js
//
// Vercel serverless function — server-side Meta Conversions API (CAPI) "Lead" event.
//
// ⚠️  SCAFFOLD ONLY — NOT wired to the live form yet.
//     The client-side fetch to this endpoint is commented out in index.html on purpose
//     (search for "TODO: enable after META_CAPI_TOKEN"). Enable it deliberately AFTER you
//     set META_CAPI_TOKEN in Vercel and test it. Until then this file does nothing.
//
// Why it exists: the browser pixel can be blocked by ad-blockers, dropped on fast mobile
// navigation, or lost entirely. A server-side Lead is the reliable copy. It is sent with the
// SAME eventID the browser pixel used, so Meta DEDUPLICATES the browser Lead and this server
// Lead into a single Lead (matched on event_name + event_id).
//
// Dataset / Pixel ID : 1397499955522386   (same pixel as the browser code — never the old one)
// Auth               : process.env.META_CAPI_TOKEN  (System-User access token; NEVER hardcode)
//                      If the token is absent, this endpoint no-ops cleanly (HTTP 200, skipped)
//                      so the client never sees an error.
//
// Module system: CommonJS on purpose — this project has no package.json / "type":"module",
// so Vercel treats .js as CommonJS. Node 18+ (Vercel default) provides a global fetch().

const crypto = require('crypto');

const PIXEL_ID = '1397499955522386';
const API_VERSION = 'v21.0';

// Meta requires PII to be SHA-256 hashed, lowercased and trimmed first.
function hashField(value) {
  if (!value) return undefined;
  return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
}
// Phone: strip to digits (keep country code), then hash. No '+' or punctuation.
function hashPhone(value) {
  const digits = String(value || '').replace(/[^0-9]/g, '');
  if (!digits) return undefined;
  return crypto.createHash('sha256').update(digits).digest('hex');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const token = process.env.META_CAPI_TOKEN;
  if (!token) {
    // Not configured yet → no-op cleanly. This is the expected state until you enable CAPI.
    res.status(200).json({ ok: true, skipped: 'META_CAPI_TOKEN not set' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    // The eventID MUST match the browser pixel's eventID, or dedup won't work.
    const eventId = body.eventID || body.eventId;
    if (!eventId) {
      res.status(400).json({ error: 'Missing eventID (must match the browser pixel for dedup)' });
      return;
    }

    // Advanced matching — all optional. Hashed here; raw PII is never logged or stored.
    const user_data = {};
    const em = hashField(body.email);
    const ph = hashPhone(body.phone);
    if (em) user_data.em = [em];
    if (ph) user_data.ph = [ph];
    if (body.fbp) user_data.fbp = body.fbp; // _fbp cookie, if the client forwards it
    if (body.fbc) user_data.fbc = body.fbc; // _fbc cookie, if the client forwards it
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (ip) user_data.client_ip_address = ip;
    const ua = body.clientUserAgent || req.headers['user-agent'];
    if (ua) user_data.client_user_agent = ua;

    const payload = {
      data: [
        {
          event_name: 'Lead',
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,            // <-- DEDUP KEY: must equal the browser pixel eventID
          action_source: 'website',
          event_source_url: body.eventSourceUrl || req.headers.referer || undefined,
          user_data: user_data
        }
      ]
      // , test_event_code: 'TESTxxxxx'  // uncomment + set to watch events in Meta Test Events
    };

    const resp = await fetch(
      'https://graph.facebook.com/' + API_VERSION + '/' + PIXEL_ID + '/events?access_token=' + encodeURIComponent(token),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );
    const result = await resp.json().catch(function () { return {}; });
    res.status(resp.ok ? 200 : 502).json({ ok: resp.ok, meta: result });
  } catch (err) {
    res.status(500).json({ error: String((err && err.message) || err) });
  }
};
