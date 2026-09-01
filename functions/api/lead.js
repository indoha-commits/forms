const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_LEAD_WEBHOOK_URL = 'https://sales.indataflow.com/integrations/leads/website';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

async function readUpstreamBody(response) {
  try {
    return (await response.text()).slice(0, 500);
  } catch {
    return '';
  }
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

  const leadWebhookUrl = context.env.LEAD_WEBHOOK_URL || DEFAULT_LEAD_WEBHOOK_URL;

  let forwarded;
  try {
    forwarded = await fetch(leadWebhookUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(context.env.SALES_INTAKE_SECRET
          ? { 'X-InDataFlow-Lead-Secret': context.env.SALES_INTAKE_SECRET }
          : {}),
      },
      body: JSON.stringify(lead),
    });
  } catch {
    return json({
      error: 'Lead destination is unavailable',
      destination: leadWebhookUrl,
    }, 502);
  }

  if (!forwarded.ok) {
    const upstreamBody = await readUpstreamBody(forwarded);
    return json({
      error: 'Lead destination rejected the request',
      destination: leadWebhookUrl,
      upstream_status: forwarded.status,
      upstream_status_text: forwarded.statusText,
      upstream_body: upstreamBody,
    }, 502);
  }
  return json({ ok: true });
}

export function onRequest() {
  return json({ error: 'Method not allowed' }, 405);
}
