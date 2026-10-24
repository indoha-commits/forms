const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LEAD_WEBHOOK_URL =
  'https://sales.indataflow.com/integrations/leads/website';

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

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return json({ error: 'Invalid request' }, 400);
  }

  // Validate the field names submitted by the frontend.
  const required = [
    'full_name',
    'email',
    'company',
    'role',
    'country',
  ];

  if (
    required.some(
      (key) => !String(payload[key] || '').trim()
    )
  ) {
    return json({ error: 'Required details are missing' }, 400);
  }

  const email = String(payload.email).trim();

  if (!EMAIL_PATTERN.test(email)) {
    return json({ error: 'A valid email is required' }, 400);
  }

  if (payload.consent !== true) {
    return json({ error: 'Consent is required' }, 400);
  }

  // Require the existing environment secret.
  const secret = context.env.SALES_INTAKE_SECRET;

  if (!secret) {
    console.error('Lead forwarding secret is not configured');

    return json({
      error: 'Lead submission is temporarily unavailable',
    }, 500);
  }

  const companyDomain = String(
    payload.company_website || ''
  ).trim();

  // Build the payload expected by the receiving sales service.
  const lead = {
    full_name: String(payload.full_name).trim().slice(0, 120),
    email: email.slice(0, 180),
    company: String(payload.company).trim().slice(0, 180),

    company_domain: companyDomain
      ? companyDomain.slice(0, 300)
      : undefined,

    job_title: String(payload.role).trim().slice(0, 120),
    country: String(payload.country).trim().slice(0, 100),

    message: String(payload.improvement_goal || '').slice(0, 400),

    consent: true,

    source: String(payload.source || 'website').slice(0, 100),
    source_detail: String(
      payload.source_detail || 'signup_form'
    ).slice(0, 120),

    utm_source: String(payload.utm_source || '').slice(0, 160),
    utm_medium: String(payload.utm_medium || '').slice(0, 160),
    utm_campaign: String(payload.utm_campaign || '').slice(0, 160),
    campaign_id: String(payload.campaign_id || '').slice(0, 160),
    post_id: String(payload.post_id || '').slice(0, 160),
    page_url: String(payload.page_url || '').slice(0, 500),

    submitted_at: new Date().toISOString(),
  };

  try {
    const forwarded = await fetch(LEAD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Company-Core-Lead-Secret': secret,
      },
      body: JSON.stringify(lead),
    });

    if (!forwarded.ok) {
      console.error('Lead destination rejected request', {
        status: forwarded.status,
        statusText: forwarded.statusText,
        body: await readUpstreamBody(forwarded),
      });

      return json({
        error: 'Unable to submit your request. Please try again later.',
      }, 502);
    }

    return json({ ok: true });
  } catch (error) {
    console.error('Lead forwarding failed', {
      message: error instanceof Error
        ? error.message
        : 'Unknown error',
    });

    return json({
      error: 'Unable to submit your request. Please try again later.',
    }, 502);
  }
}

export function onRequest() {
  return json({ error: 'Method not allowed' }, 405);
}
