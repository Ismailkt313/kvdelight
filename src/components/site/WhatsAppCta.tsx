import { whatsappHref } from "@/lib/founder";

/**
 * The founder's WhatsApp call to action.
 *
 * One component, one URL builder, one disabled fallback, so the button can never
 * drift from the configured number. It lives here rather than inside the founder
 * section because it is the *page's* single WhatsApp action — the footer
 * deliberately does not repeat it.
 *
 * The number is validated in `lib/founder`; if it were ever emptied, this
 * renders an inert button instead of a link and says why through `noteId`.
 */
export default function WhatsAppCta({ noteId }: { noteId?: string }) {
  const href = whatsappHref();

  const shape =
    "inline-flex min-h-[52px] w-full items-center justify-center gap-3 rounded-sm px-5 py-3.5 text-center text-[0.82rem] font-medium leading-tight tracking-[0.01em] transition-colors duration-300 sm:w-auto sm:px-7 sm:text-[0.86rem]";

  const label = <span>Chat with Sameer on WhatsApp</span>;

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-describedby={noteId}
        className={`${shape} bg-brand-green text-cream ring-1 ring-inset ring-gold/25 hover:bg-[#187a45] hover:ring-gold/45`}
      >
        <WhatsAppGlyph />
        {label}
      </a>
    );
  }

  return (
    <button
      type="button"
      disabled
      aria-describedby={noteId}
      className={`${shape} cursor-not-allowed bg-brand-green/45 text-cream/70 ring-1 ring-inset ring-gold/15`}
    >
      <WhatsAppGlyph />
      {label}
    </button>
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
