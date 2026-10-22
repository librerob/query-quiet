# Identity assets

The mark combines a magnifying glass and an open Q. Its detached dot suggests a query leaving the loop. Pale mint (`#D0F5DC`) sits on deep pine (`#173B32`); the README uses a darker field (`#101F1A`). There are no gradients, shadows, external fonts, or remote resources.

| File | Purpose |
| --- | --- |
| `icon.svg` | Editable 128-unit vector master |
| `icon-512.png` | Large transparent preview / general brand use |
| `../icons/icon-16.png` | Extension page icon, optically enlarged for small size |
| `../icons/icon-32.png` | High-density page icon |
| `../icons/icon-48.png` | Chrome extension manager |
| `../icons/icon-128.png` | Installation and Chrome Web Store icon |
| `readme-header.svg` | GitHub README wordmark and matching mark |
| `store-promo.svg` | Editable promotional tile |
| `store-promo-440x280.png` | Small Chrome Web Store promotional image |

Only the four PNGs under `icons/` enter the extension ZIP. The SVG masters and other branding assets stay outside the install package. They are covered by the repository's MIT license.

The 128-pixel icon has a 96-pixel tile and 16 pixels of transparent padding on each side. The 16-pixel export enlarges the artwork by 7/6 around its center; 32- and 48-pixel exports use 13/12. These optical adjustments help the shape survive at small sizes. Export from the vector master with those transforms using a vector editor or SVG rasterizer; no graphics library is needed by the extension.

For a future store submission, use `../icons/icon-128.png` and `store-promo-440x280.png`. A listing also needs an actual extension screenshot at 1280×800 or 640×400, plus its listing text and privacy declarations. The promotional tile is a brand image, not a screenshot. See Google's [image requirements](https://developer.chrome.com/docs/webstore/images). Recheck those requirements when submitting; these assets do not imply store approval.
