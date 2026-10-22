import WhatsAppCta from "@/components/site/WhatsAppCta";
import { FOUNDER, WHATSAPP_CONFIGURED } from "@/lib/founder";

/**
 * The founder invitation.
 *
 * This is the last thing a visitor sees before the footer, and it has one job:
 * open a conversation with Sameer. So it is not a card, not a contact form and
 * not a grid of channels — it is a portrait, an invitation, and one button.
 *
 * Layout is the same block at every size, only rotated: on a phone the portrait
 * comes first (the face earns the scroll), then the headline, the name, the
 * invitation and a full-width button within thumb reach; from `lg` it splits into
 * portrait and copy. The photograph is graded into the ink with gradients rather
 * than framed, which is what keeps it from reading as a card.
 */
export default function FounderSection() {
  return (
    <section
      id="founder"
      aria-labelledby="founder-heading"
      className="relative isolate overflow-hidden bg-[linear-gradient(180deg,#0c0703_0%,#0a0603_24%,#0a0603_100%)]"
    >
      {/* Warm light from the upper left, the same key direction as the stages. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(115%_85%_at_14%_-6%,rgba(230,180,92,0.12),transparent_58%),radial-gradient(90%_70%_at_88%_108%,rgba(201,138,63,0.08),transparent_62%)]"
      />

      <div className="relative mx-auto grid max-w-[1500px] items-center gap-y-8 px-5 pb-14 pt-12 sm:px-10 sm:pb-16 sm:pt-16 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-x-16 lg:pb-20 lg:pt-20">
        <figure className="relative order-1 mx-auto w-full max-w-[560px] lg:mx-0 lg:max-w-none">
          <div className="relative overflow-hidden">
            <img
              src="/assets/founder/sameer-kv.webp"
              alt="Sameer KV, founder of KV Delight, seated at a table with a phone in his hand."
              width={1200}
              height={1074}
              loading="lazy"
              decoding="async"
              className="aspect-[5/4] w-full object-cover object-[53%_28%] brightness-[0.95] saturate-[0.96] sm:aspect-[4/3] lg:aspect-[6/5] lg:object-[54%_26%]"
            />
            {/* Brand grade: warm lift, then the edges melt into the ink. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(92%_74%_at_30%_22%,rgba(230,180,92,0.1),transparent_64%)] mix-blend-screen"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#0a0603] via-[#0a0603]/45 to-transparent"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-[#0a0603]/60 to-transparent"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-1/5 bg-gradient-to-l from-[#0a0603]/55 to-transparent"
            />
          </div>
        </figure>

        <div className="order-2 mx-auto w-full max-w-[600px] lg:mx-0 lg:max-w-[560px]">
          <p className="eyebrow text-gold/90">Meet the Founder</p>

          <h2
            id="founder-heading"
            className="display mt-4 text-[clamp(1.7rem,4.4vw,2.7rem)] uppercase leading-[1.08] text-cream"
          >
            Are you interested in KV Delight products?
          </h2>

          <div className="mt-6 flex items-center gap-4">
            <span aria-hidden="true" className="rule-gold h-px w-10 shrink-0" />
            <p className="display text-[clamp(1.32rem,3vw,1.85rem)] text-gold">
              {FOUNDER.name}
            </p>
          </div>

          <blockquote className="mt-4 max-w-[46ch] text-[0.95rem] leading-relaxed text-cream/80 sm:text-base">
            &ldquo;{FOUNDER.quote}&rdquo;
          </blockquote>

          <div className="mt-7">
            <WhatsAppCta noteId="founder-whatsapp-note" />

            {WHATSAPP_CONFIGURED ? (
              <p
                id="founder-whatsapp-note"
                className="mt-3 text-[0.7rem] leading-relaxed text-cream/40"
              >
                Opens WhatsApp in a new tab.
              </p>
            ) : (
              <p
                id="founder-whatsapp-note"
                className="mt-3 text-[0.72rem] leading-relaxed text-cream/40"
              >
                WhatsApp number not configured yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
