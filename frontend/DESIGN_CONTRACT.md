# Design Contract — VERITY

Written against the `frontend-design-direction` skill
(github.com/affaan-m/ECC, `skills/frontend-design-direction`). This file is the
checkable record that skill asks for: direction, states, and the evidence that
backs them. Re-read this before changing the visual system so new work stays
coherent with the reasoning below, not just the current CSS.

## 1. Direction

- **Purpose**: a single-model explainability instrument — submit an article,
  get a classification and a SHAP-based explanation for *why*. Not a
  multi-tenant SaaS product.
- **Audience**: the person running/demoing it locally (a college review
  presenter and the evaluators watching), not a team doing daily repeat ops.
  Still built as a real, repeatable tool, not a one-shot marketing page.
- **Tone**: technical, editorial, restrained — closer to a research console
  than a generic admin dashboard template.
- **Memorable detail**: the verdict itself is the visual anchor (large pill +
  probability bars + highlighted article text), not a decorative chart
  pushed below the fold.
- **Constraints**: no build step (plain HTML/CSS/JS, served as static files by
  FastAPI), existing `/api/predict` and `/api/explain` contracts unchanged,
  WCAG-reasonable contrast and touch targets, works at mobile and desktop
  widths.

## 2. Palette: monochrome shell, red/green as the one deliberate signal

Base UI (chrome, nav, cards, buttons, borders) is pure black/white/grayscale —
no hue. On top of that, two explicit instructions were given in sequence:

1. Keep it monochrome.
2. **Fake is flagged red, Real is flagged green** — everywhere that specific
   signal appears: pills, probability bars, SHAP contribution bars, token
   highlighting, and the confusion matrix's correct/incorrect cells.

Both are satisfied together: red/green is the *only* hue in the system, used
*only* for this one signal, nowhere else (nav, buttons, model-comparison
charts that aren't a Fake/Real judgment stay monochrome). Icon shape
(alert-circle for Fake, check for Real) and the text label are kept alongside
color, not replaced by it, so the signal still doesn't depend on hue
perception alone:

| Signal | Treatment |
| --- | --- |
| Fake / toward Fake | Red fill (`--fake: #f0717c`), alert-circle icon |
| Real / toward Real | Green fill (`--real: #42c99a`), check icon |
| Correct confusion-matrix cell | Green fill, intensity scaled by count |
| Incorrect confusion-matrix cell | Red dashed outline |
| Model-vs-model accuracy chart (not a Fake/Real judgment) | Stays monochrome (white) |

## 3. Glassmorphism: applied selectively, not decoratively

Glass (translucency + `backdrop-filter: blur`) is used **only on surfaces that
genuinely overlay other content**:

- The sidebar, especially the mobile off-canvas drawer (it visibly blurs the
  real form behind it — verified in `evidence/screenshots/390x844__*`).
- The sticky mobile topbar (blurs content scrolling beneath it).
- Banners/callouts (float above the page's reading flow).

Flat, solid cards are used everywhere else — form inputs, data tables, the
confusion matrix, metric tables. Per the skill's own guidance ("A SaaS
operations tool should usually be dense, quiet, and scannable" / don't apply
"a single decorative style everywhere"), blurring dense tabular data behind
glass would hurt scannability for no functional reason. A very faint
(~3% opacity) grayscale noise texture is applied to `body` so glass surfaces
have real texture to diffuse rather than a flat color — not a gradient, not a
"blob," just material.

## 4. Structural change: Analyze Article is the landing route

The previous build had a separate "Overview" welcome/marketing page with
capability cards describing the other pages in ad-copy language. Per the
skill: *"Build the actual usable experience as the first screen unless the
user explicitly asks for marketing copy."* Overview was removed; the live
backend-status banner it showed was folded into a slim strip at the top of
Analyze Article, which is now the default route (`frontend/js/main.js`).

## 5. Content states

| State | Trigger | Visible feedback | Evidence |
| --- | --- | --- | --- |
| Empty | Page loads, no input yet | Result panel shows a neutral "submit an article" message | `*__empty.png` |
| Loading | Predict/Explain submitted | Spinner + status text; form stays stable, submit button disabled | `*__loading.png` |
| Success | Prediction returns | Pill, confidence, probability bars, disclaimer | `*__success.png` |
| Validation error | Empty title+body submitted | Inline error near the form, no request sent | `*__validation-error.png` |
| Error (network) | Backend unreachable | Specific recovery message ("check the server is running..."), not a raw browser error string | `*__network-error.png` |
| Partial | Prediction OK, SHAP explanation fails | Prediction stays fully visible and valid; explanation failure shown as a separate, isolated error | `*__partial-explanation-failed.png` |
| Permission | — | **Not applicable** — the app has no auth/access boundaries; nothing to gate | — |

Loading/validation/network-error/partial states were captured by intercepting
`/api/predict` and `/api/explain` with Playwright route mocking (delay, abort,
and a crafted `explanation_error` response) rather than relying on a real
failure happening to occur during capture — this is a frontend-rendering
check (does the state's CSS/markup render correctly), not a backend
reliability claim; backend behavior itself is covered separately by
`tests/test_api.py`.

**Finding from this process**: the first `network-error` capture showed the
browser's raw `"Failed to fetch"` string instead of an actionable message —
fixed in `frontend/js/api.js` to show a specific recovery instruction. This is
exactly the kind of thing the rendered-finish gate is meant to catch; source
review alone had missed it.

## 6. Accessibility / responsive checks performed

- Keyboard: skip-link to `#content`, visible `:focus-visible` ring on all
  interactive elements (inputs, buttons, switch, nav items).
- Touch targets: buttons, nav items, and the compact-sidebar toggle are all
  `min-height: 44px` (`--touch-min` token).
- Charts (SVG bars, confusion matrix) have `role="img"` + `aria-label` with
  the literal value, not just a hover-only `title` attribute.
- `prefers-reduced-motion: reduce` zeroes transition durations and freezes the
  loading spinner's rotation.
- Verified no horizontal overflow at `390x844` (`document.documentElement
  .scrollWidth <= clientWidth`), and the mobile nav drawer opens/closes
  correctly over blurred content.
- Verified via direct DOM query (not screenshot reading, which proved
  unreliable at a glance under monochrome) that exactly one `.nav-item` holds
  `.active` at a time.

## 7. Known gaps / not independently verified

- Screen-reader output (actual NVDA/VoiceOver pass) was not tested — only
  semantic markup, `aria-label`s, and focus order were checked.
- The confusion-matrix heatmap's dashed-vs-solid distinction has not been
  checked against actual color-vision-deficiency simulation tools, only
  reasoned about (it avoids hue entirely by construction, so this is lower
  risk than a color-coded version, but unverified).
- No automated visual-regression testing is wired up; this evidence record is
  a point-in-time capture, not a CI gate.
