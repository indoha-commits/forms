# InDataFlow Operations Checklist Popup

A dependency-free Cloudflare Pages project containing the finished two-step lead form, confirmation state, campaign attribution, responsive design, and a server-side lead forwarding function.

## Deploy to Cloudflare Pages

1. Upload this folder to a Git repository.
2. In Cloudflare Pages, create a project from the repository.
3. Set the build command to empty.
4. Set the build output directory to `/`.
5. Set `LEAD_WEBHOOK_URL` to the desired destination. If omitted, the function falls back to `https://sales.indataflow.com/integrations/leads/website`.
6. Set `SALES_INTAKE_SECRET` to send `X-InDataFlow-Lead-Secret` to the sales intake endpoint.
7. Deploy.

The webhook receives JSON containing the visible form fields, consent, source fields, campaign parameters, page URL, and submission time.

## Campaign parameters

The page automatically captures:

- `source` (defaults to `popup_offer`)
- `source_detail` (defaults to `operations_checklist_popup`)
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `campaign_id`
- `post_id`

Example:

`/?utm_source=instagram&utm_medium=social&utm_campaign=launch&post_id=carousel_01`

## Local preview

Use any static server for the interface. Submissions require Cloudflare Pages Functions or an equivalent endpoint at `/api/lead`.

## Embed behavior

The page opens the modal automatically. The `Get the checklist` button reopens it after dismissal. To embed this inside an existing InDataFlow page instead, copy the modal markup, stylesheet, script, assets, and Pages Function into that project.
