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
