# Asset credits & provenance

Originals are preserved untouched in `/uploads` (repo root sibling) and copied here.
Every file below is a supplied KV Delight asset — no stock, no generated substitutes.

| File here | Source upload | Role in the experience |
|---|---|---|
| `brand/kv-delight-logo-reference.png` | image-5.png | Clean/redrawn logo. **Reference only** — the source of every derived mark below. |
| `brand/kv-delight-mark.png` / `.webp` | derived from `kv-delight-logo-reference.png` | The same artwork with its page-white removed, nothing else changed: no recolour, no crop, no redraw, no added ring or glow. Alpha was taken from a padded-canvas flood of the surrounding page. |
| `brand/packaging-sandwich-bread.png` | image-4.png | Bread chapter finale: fully packaged reveal. |
| `brand/packaging-buns-8pack.png` | image-3.png | Bun chapter packaging (stage 2, not built). |
| `brand/packaging-cream-bun-4pack.png` | image-2.png | Cream bun chapter packaging (stage 2, not built). |
| `product/bread-hero-scene.png` | image-1.png | Opening cinematic scene / WebGL fallback backdrop. |
| `product/cream-bun-hero.png` | image-6.png | Cream bun beauty shot (stage 2). |
| `product/cream-bun-cross-section.png` | image-7.png | Cream bun interior reveal (stage 2). image-8…12 were byte-identical duplicates and are not copied. |
| `style/` | — | Reserved for the five coffee-website screenshots (still missing). |

Derived `*.webp` files are lossy conversions of the PNGs above, generated for delivery only.

`kv-delight-mark.*` has a further note worth keeping: the logo is **ink with no
plate of its own**, and its oval ring is an open arc, so the white behind the
letters cannot be keyed out in a way that encloses them. On screen the mark is
therefore set on a cream oval element (`src/components/site/BrandMark.tsx`) —
the treatment the brand's own `product/bread-hero-scene.png` uses. The artwork
file itself is left exactly as supplied apart from the removed page white.
