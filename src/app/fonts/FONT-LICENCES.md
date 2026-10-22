# Font licences

Both typefaces are self-hosted from `src/app/fonts/` (via `next/font/local`), so
no request is made to Google Fonts at build time or at runtime. The files are the
`latin` variable-weight builds from Fontsource, version 5.3.0.

| File | Typeface | Upstream | Licence |
|---|---|---|---|
| `cormorant-garamond-latin-var.woff2` | Cormorant Garamond (variable, 300–700) | [CatharsisFonts/Cormorant](https://github.com/CatharsisFonts/Cormorant) | SIL Open Font Licence 1.1 |
| `inter-latin-var.woff2` | Inter (variable, 100–900) | [rsms/inter](https://github.com/rsms/inter) | SIL Open Font Licence 1.1 |

Source packages: `@fontsource-variable/cormorant-garamond@5.3.0`,
`@fontsource-variable/inter@5.3.0`.

The SIL OFL permits bundling and redistribution of the font files, including in
web applications, provided the files are not sold on their own and the licence is
carried with them. The full OFL text ships in each upstream repository
(`OFL.txt`) and is not duplicated here.
