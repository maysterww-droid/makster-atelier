# Design QA — portfolio presentation refresh

## Result

**PASSED** — the project presentation matches the approved reference direction, preserves the real project photography, and the requested portfolio reveal and photo-enlargement interactions work in the Vercel Preview.

## Evidence

- Source reference: `/workspace/scratch/127c5bc0c639/upload/01-1000037597.png`
- Rendered implementation: `/workspace/scratch/makster-portfolio-desktop-qa.png`
- Side-by-side comparison: `/workspace/scratch/makster-portfolio-design-compare.png`
- Preview route: `https://makster-atelier-oxwkx5pmh-makster.vercel.app/realizace/gloss-walnut-kitchen`
- Desktop comparison viewport: 1365 × 936 px

## Fidelity review

| Surface | Result | Evidence |
|---|---|---|
| Layout and hierarchy | Pass | Breadcrumb, 31/69 information-and-image split, large serif project title, three benefits, image controls, and horizontal thumbnail strip follow the reference composition. |
| Spacing | Pass | The copy, hero, benefit row, and thumbnail strip retain clear grouping without overlaps or clipped controls. |
| Typography | Pass | Serif display hierarchy and compact sans-serif metadata preserve the reference's editorial character; long Russian copy wraps cleanly. |
| Colors and surfaces | Pass | Black background, ivory type, restrained gold accents, fine borders, and square controls match the Makster visual system. |
| Image fidelity | Pass | Only supplied real project photos are used. No furniture, architecture, or construction details were generated or altered. The real source photos intentionally retain their original on-site condition instead of reproducing the retouched mock image. |
| Icons | Pass | One consistent Lucide stroke family is used for benefits, expand, navigation, and close controls. |
| Copy and localization | Pass | RU, UA, CS, EN, PL, and DE portfolio headings and filters were exercised in-browser; Russian project captions, benefits, dialog label, and close label were also verified. |
| Responsive structure | Pass | At the ≤760 px breakpoint the two-column case study becomes a single column, hero height is bounded, controls remain inside the image, thumbnails become a horizontal touch strip, and the all-projects control becomes full width. |
| Accessibility | Pass | Semantic buttons, localized labels, alt text, visible focus rings, 40–54 px key controls, Escape and arrow-key support, initial dialog focus, scroll locking, and reduced-motion overrides are present. |

## Interaction verification

- Default portfolio view renders 7 ranked featured projects.
- “All projects” reveals all 22 projects and the status filters.
- Clicking any thumbnail opens that exact image in the lightbox.
- Main-image expand opens the active image.
- Previous/next controls update both image and counter.
- Keyboard ArrowLeft/ArrowRight navigate; Escape closes.
- Closing restores body scrolling.
- The clean Preview tab produced no application console warnings or errors; the only logged error came from the browser extension layer and is unrelated to the site.

## Issues fixed during QA

1. Thumbnail clicks originally selected a frame but required a second click to enlarge it. Each thumbnail now opens its own full-screen image directly.
2. The lightbox now locks background scrolling, focuses the close button, and exposes correct cyclic previous/next labels.
3. The project summary punctuation is rendered as one coherent localized string.
4. Focus and reduced-motion treatments were added for the new gallery controls.

## Remaining intentional differences

- The supplied reference uses a cleaned, highly polished kitchen image. The implementation keeps the authentic project photos unchanged, as required, so temporary objects visible in the originals remain visible.
- Header wording and navigation depth continue to use the site's existing six-language information architecture rather than copying the reference literally.

---

## Incremental QA — featured project swap (2026-10-02)

### Evidence

- Source visual truth: `/workspace/scratch/127c5bc0c639/attachments/bf79e02a-f28c-4645-a656-f40e907c39ad/2026-10-01 (75).png` and `/workspace/scratch/127c5bc0c639/attachments/fe76937e-7bc2-4e67-b12b-667778825a46/2026-10-01 (74).png`.
- Browser-rendered implementation: Work Mode cloud-browser capture of `http://terminal.local:4173/#realizace` in this QA run (the browser capture API did not expose a local filesystem path).
- Viewport: 1365 × 936 CSS px, desktop, device density 1×.
- State: homepage selected-project grid, English localization; project №2 visible.

### Full-view and focused comparison

- The homepage keeps the approved black-and-gold composition, typography, spacing, overlay treatment, status badge, image proportions, and seven-card hierarchy.
- Project №2 now uses the authentic wine-room photograph and the localized wine-room title/category/details.
- The salon partition no longer appears in the seven selected cards. Its project data and route remain intact for the expanded all-projects catalogue.
- A focused crop comparison was not needed because this change swaps an existing project card into the unchanged card component; the supplied wine-room photograph is shown without alteration.

### Required fidelity surfaces

- Fonts and typography: unchanged; the existing serif title and compact metadata retain their approved sizes and wrapping.
- Spacing and layout rhythm: unchanged; the new card occupies the same grid slot with no overflow or reflow regression.
- Colors and visual tokens: unchanged; black surfaces, ivory copy, gold accents, status badge, and image shade remain consistent.
- Image quality and asset fidelity: pass; the real wine-room cover image is used directly, without generated furniture or architectural edits.
- Copy and content: pass; all six existing localized wine-room strings remain connected to the card and detail route.

### Interaction and build checks

- Production build: passed (`npm run build`, 34 static pages generated).
- Selected-project data: 7 projects; wine room rank 2; salon partition excluded from featured results.
- The all-projects reveal implementation is unchanged from the previously verified interaction. In this local Work Mode browser, storage-backed client interactions could not be exercised even though the page rendered and no application console errors were reported; production verification remains required on the Vercel Preview before release.
- ESLint is blocked by the repository's pre-existing missing ESLint 9 flat configuration; this data-only change introduces no new lint configuration issue.

### Findings

- No actionable P0/P1/P2 visual mismatch found in the rendered selected-project grid.
- Preview interaction verification is the remaining release gate, not a visual defect.

final result: passed
