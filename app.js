const modal = document.querySelector('#lead-modal');
const form = document.querySelector('#lead-form');
const stepLabel = document.querySelector('#step-label');
const errorNode = document.querySelector('#form-error');
const submitButton = form.querySelector('button[type="submit"]');
const leadEndpoint = form.dataset.endpoint || '/api/lead';

function showStep(step) {
  form.querySelectorAll('.form-step').forEach((node) => {
    node.classList.toggle('is-active', node.dataset.step === String(step));
  });
  stepLabel.textContent = step === 'success' ? 'COMPLETE' : `${step} / 2`;
  errorNode.textContent = '';
  modal.querySelector('.form-shell').scrollTop = 0;
}

function openForm() {
  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  window.setTimeout(() => modal.querySelector('.is-active button, .is-active input')?.focus(), 120);
}

function closeForm() {
  modal.classList.remove('is-open');
  document.body.style.overflow = '';
}

document.querySelectorAll('[data-open-form]').forEach((button) => button.addEventListener('click', openForm));
document.querySelectorAll('[data-close-form]').forEach((button) => button.addEventListener('click', closeForm));
document.querySelector('#next-step').addEventListener('click', () => showStep(2));
document.querySelector('#previous-step').addEventListener('click', () => showStep(1));

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modal.classList.contains('is-open')) closeForm();
});

function attribution() {
  const query = new URLSearchParams(window.location.search);
  return {
    source: query.get('source') || 'popup_offer',
    source_detail: query.get('source_detail') || 'operations_checklist_popup',
    utm_source: query.get('utm_source') || '',
    utm_medium: query.get('utm_medium') || '',
    utm_campaign: query.get('utm_campaign') || '',
    campaign_id: query.get('campaign_id') || '',
    post_id: query.get('post_id') || '',
    page_url: window.location.href,
  };
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorNode.textContent = '';
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());
  data.consent = form.elements.consent.checked;
  Object.assign(data, attribution());

  submitButton.disabled = true;
  submitButton.textContent = 'Sending…';
  try {
    const response = await fetch(leadEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Submission failed');
    form.reset();
    showStep('success');
  } catch (error) {
    errorNode.textContent = error.message || 'We could not send your request. Please try again.';
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Send it';
  }
});
