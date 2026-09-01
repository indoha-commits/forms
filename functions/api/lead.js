const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export async function onRequestPost(context) {
  let payload;
  try {
    payload = await context.request.json();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  const required = ['full_name', 'work_email', 'company', 'role', 'country'];
  if (required.some((key) => !String(payload[key] || '').trim())) {
    return json({ error: 'Required details are missing' }, 400);
  }
  if (!EMAIL_PATTERN.test(String(payload.work_email))) {
    return json({ error: 'A valid work email is required' }, 400);
  }
  if (payload.consent !== true) {
    return json({ error: 'Consent is required' }, 400);
  }

  const lead = {
    full_name: String(payload.full_name).slice(0, 120),
    work_email: String(payload.work_email).slice(0, 180),
    company: String(payload.company).slice(0, 180),
    company_website: String(payload.company_website || '').slice(0, 300),
    role: String(payload.role).slice(0, 120),
    country: String(payload.country).slice(0, 100),
    improvement_goal: String(payload.improvement_goal || '').slice(0, 400),
    consent: true,
    source: String(payload.source || 'popup_offer').slice(0, 100),
    source_detail: String(payload.source_detail || 'operations_checklist_popup').slice(0, 120),
    utm_source: String(payload.utm_source || '').slice(0, 160),
    utm_medium: String(payload.utm_medium || '').slice(0, 160),
    utm_campaign: String(payload.utm_campaign || '').slice(0, 160),
    campaign_id: String(payload.campaign_id || '').slice(0, 160),
    post_id: String(payload.post_id || '').slice(0, 160),
    page_url: String(payload.page_url || '').slice(0, 500),
    submitted_at: new Date().toISOString(),
  };

  if (!context.env.LEAD_WEBHOOK_URL) {
    return json({ error: 'Lead destination is not configured' }, 503);
  }

  const forwarded = await fetch(context.env.LEAD_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(context.env.LEAD_WEBHOOK_TOKEN
        ? { authorization: `Bearer ${context.env.LEAD_WEBHOOK_TOKEN}` }
        : {}),
    },
    body: JSON.stringify(lead),
  });

  if (!forwarded.ok) return json({ error: 'Lead destination rejected the request' }, 502);
  return json({ ok: true });
}

export function onRequest() {
  return json({ error: 'Method not allowed' }, 405);
}
