import BrandMark from "@/components/site/BrandMark";
import WhatsAppCta from "@/components/site/WhatsAppCta";
import { FOUNDER, WHATSAPP_CONFIGURED } from "@/lib/founder";
import { SECTIONS } from "@/lib/sections";

/**
 * The footer.
 *
 * The page ends on the founder invitation, so the footer is not a second
 * send-off — it is the sign-off: who this is, where the three chapters are, and
 * one last way to start the conversation. Three columns on a wide screen, one
 * stack on a phone, and nothing invented to fill the space: no address, no
 * email, no social row, no legal paragraph. The absence is the design.
 *
 * Every link here is a plain `#id` anchor, so it uses the page's own navigation:
 * the same ids the chapter bar highlights, and the same CSS smooth scroll, which
 * still fires the scroll events the 3D chapters scrub from.
 */

/** Built once at build time; the build is what stamps the year. */
const YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <footer id="footer" className="relative isolate overflow-hidden bg-ink-deep">
      {/* One warm wash from above — the same key light as the rest of the page. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_85%_at_50%_-25%,rgba(230,180,92,0.10),transparent_62%)]"
      />
      {/* The border is a gradient hairline, not a bar: gold at the centre, ink at
          the edges, so the footer begins the way the chapters begin. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(230,180,92,0.35),transparent)]"
      />

      <div className="relative mx-auto max-w-[1500px] px-5 pb-8 pt-12 sm:px-10 sm:pb-9 sm:pt-14 lg:pt-16">
        <div className="grid gap-y-10 sm:gap-y-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.72fr)_minmax(0,1.05fr)] lg:gap-x-12">
          {/* Identity */}
          <div>
            <a
              href="#top"
              aria-label="KV Delight — back to the top"
              className="-ml-1 inline-flex min-h-[44px] items-center gap-3 rounded-sm px-1"
            >
              <BrandMark className="h-11 sm:h-12" />
              <span className="wordmark text-[0.62rem] sm:text-[0.66rem]">KV Delight</span>
            </a>

            <span aria-hidden="true" className="rule-gold mt-5 block h-px w-12" />
            <p className="tagline mt-4 text-[0.56rem] text-cream-dim/90 sm:text-[0.58rem]">
              Softness · Freshness · Happiness
            </p>
          </div>

          {/* The three chapters, in scroll order */}
          <nav aria-labelledby="footer-products" className="sm:max-w-[480px] lg:max-w-none lg:pt-1">
            <h2 id="footer-products" className="eyebrow text-[0.6rem] text-gold/85">
              Products
            </h2>
            <ul className="mt-2.5 border-t border-cream/10">
              {SECTIONS.map((section) => (
                <li key={section.id} className="border-b border-cream/10">
                  <a
                    href={`#${section.id}`}
                    className="group flex min-h-[48px] items-center justify-between gap-4 text-[0.82rem] text-cream/80 transition-colors hover:text-cream"
                  >
                    <span>{section.label}</span>
                    <span
                      aria-hidden="true"
                      className="h-px w-4 shrink-0 bg-gold/35 transition-[width,background-color] duration-300 group-hover:w-7 group-hover:bg-gold/80"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* The last invitation */}
          <div className="sm:max-w-[520px] lg:max-w-none lg:pt-1">
            <div className="flex items-center gap-3">
              <img
                src="/assets/founder/sameer-kv.webp"
                alt=""
                width={96}
                height={96}
                loading="lazy"
                decoding="async"
                className="h-12 w-12 shrink-0 rounded-full object-cover object-[53%_30%] ring-1 ring-gold/30 sm:h-14 sm:w-14"
              />
              <span className="flex min-w-0 flex-col">
                <span className="display text-[1.02rem] leading-tight text-cream">
                  {FOUNDER.name}
                </span>
                <span className="mt-1 text-[0.58rem] uppercase tracking-[0.22em] text-cream/60">
                  Founder
                </span>
              </span>
            </div>

            <p className="mt-4 max-w-[34ch] text-[0.9rem] leading-relaxed text-cream/75 sm:text-[0.92rem]">
              Interested in our products?
            </p>

            <div className="mt-4">
              <WhatsAppCta
                compact
                noteId={WHATSAPP_CONFIGURED ? undefined : "footer-whatsapp-note"}
              />
              {!WHATSAPP_CONFIGURED && (
                <p
                  id="footer-whatsapp-note"
                  className="mt-2.5 text-[0.72rem] leading-relaxed text-cream/55"
                >
                  WhatsApp number not configured yet.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sign-off */}
        <div className="mt-12 flex flex-col gap-3 border-t border-cream/10 pt-6 sm:mt-14 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[0.7rem] tracking-[0.02em] text-cream/55">
            © {YEAR} KV Delight
          </p>
          <p className="flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.24em] text-cream/60">
            <span aria-hidden="true" className="h-1 w-1 rounded-full bg-gold/70" />
            Made with care
          </p>
        </div>
      </div>
    </footer>
  );
}
