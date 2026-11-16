# Global HRM Network — Email Templates & Brand Theme Guide

## 1. Where to Manage Templates
Navigate to **Admin → Email Templates** (`/admin/communications/templates`).

From this console you can:
1. Browse all 14 standard transactional and community/research templates (including the **Pakistan Launch Campaign Invitation**).
2. Filter by classification (`Transactional` vs. `Community / Research`) or status (`Published` vs. `Draft`).
3. Edit structured fields (Subject, Preheader, Eyebrow, Headline, Greeting, Body HTML, Info Panel, CTA Label & URL, Banner, Plain-Text Body, Footer).
4. Preview desktop (620px) and mobile (375px) layouts alongside the plain-text alternative using synthetic data.
5. **Save Draft** without affecting live emails, then **Publish** when ready, or **Restore** a previous published version from **Version History**.

---

## 2. Publishing & Draft Safety
- **Only `published` templates can be sent** by the central SMTP queue. Unpublished drafts (such as `verification_code`, `survey_reminder`, `research_findings`, `webinar_invitation`, `general_announcement`, `contact_acknowledgement`) remain safely inactive until destination pages/flows exist and an administrator publishes them.
- **Template versioning**: Every queued `EmailOutbox` row records the `templateVersion` used at enqueue time.
- **Required placeholders**: Required links (e.g., `{{verification_url}}`, `{{survey_url}}`, `{{unsubscribe_url}}`) cannot be removed when saving.
- **Allowlisted variables only**: Arbitrary code or unapproved template expressions are rejected.

---

## 3. Brand Assets & Theme Configuration
- Optimized email assets are stored in `public/email-assets/`:
  - `ghrm-email-logo.png` (456×170 px, 18.7 KB — margins trimmed, original preserved as `logo-original.png`)
  - `ghrm-community-banner.jpg` (640×260 px, 42.2 KB — restrained crop from `poster-original.jpg`)
- **Shared Brand Theme** (Tab 3 in **Admin → Email Templates**) enforces WCAG 4.5:1 contrast for primary buttons, headings, and body text so light colors cannot make essential text or buttons illegible.
