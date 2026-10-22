import { FOUNDER, WHATSAPP_CONFIGURED, whatsappHref } from "@/lib/founder";

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
  const href = whatsappHref();

  const buttonBase =
    "inline-flex min-h-[52px] w-full items-center justify-center gap-3 rounded-sm px-5 py-3.5 text-center text-[0.82rem] font-medium leading-tight tracking-[0.01em] transition-colors duration-300 sm:w-auto sm:px-7 sm:text-[0.86rem]";

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
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${buttonBase} bg-brand-green text-cream ring-1 ring-inset ring-gold/25 hover:bg-[#187a45] hover:ring-gold/45`}
              >
                <WhatsAppGlyph />
                <span>Chat with Sameer on WhatsApp</span>
              </a>
            ) : (
              /*
               * No number configured, so there is nothing honest to link to.
               * The button keeps its shape and its label so the design can be
               * reviewed, but it is inert and says why.
               */
              <button
                type="button"
                disabled
                aria-describedby="founder-whatsapp-note"
                className={`${buttonBase} cursor-not-allowed bg-brand-green/45 text-cream/70 ring-1 ring-inset ring-gold/15`}
              >
                <WhatsAppGlyph />
                <span>Chat with Sameer on WhatsApp</span>
              </button>
            )}

            {WHATSAPP_CONFIGURED ? (
              <p className="mt-3 text-[0.7rem] leading-relaxed text-cream/40">
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

/** The WhatsApp handset-in-a-speech-bubble, at button size. */
function WhatsAppGlyph() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="currentColor"
      className="shrink-0"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}
