/**
 * Founder contact.
 *
 * The WhatsApp number is **configuration, not a constant to guess at**. A wrong
 * number sends a customer's message to a stranger, so the field is left empty
 * until Sameer's verified account is supplied, and the section renders its call
 * to action in a disabled state rather than inventing one.
 *
 * To go live, set `whatsappNumber` to the verified number in international
 * format, **digits only** — no `+`, spaces, dashes or brackets:
 *
 *     whatsappNumber: "919876543210"   // +91 98765 43210
 *
 * Everything else (the label, the message, the URL encoding) stays as it is.
 */

export type Founder = {
  name: string;
  /** Digits only, international format. Empty until the real number arrives. */
  whatsappNumber: string;
  /** The invitation shown in the section. */
  quote: string;
  /** Prefilled into WhatsApp, exactly as supplied. */
  message: string;
};

export const FOUNDER: Founder = {
  name: "Sameer KV",
  whatsappNumber: "",
  quote:
    "Interested in our products? Connect with Sameer to learn more about KV Delight products, product details, and business enquiries.",
  message:
    "Hi Sameer, I came from the KV Delight website. May I know more about your products and details?",
};

/** A WhatsApp number is 8–15 digits, and nothing else. */
const VALID_NUMBER = /^\d{8,15}$/;

export const WHATSAPP_CONFIGURED = VALID_NUMBER.test(FOUNDER.whatsappNumber);

/**
 * `https://wa.me/<digits>?text=<encoded>`, or `null` when unconfigured.
 *
 * `encodeURIComponent` is what makes the prefill survive punctuation: the
 * message contains commas, an apostrophe-free "Hi", and a question mark, all of
 * which have to be percent-encoded for WhatsApp to read them as text.
 */
export function buildWhatsAppHref(number: string, message: string): string | null {
  if (!VALID_NUMBER.test(number)) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/** The live URL for the section, or `null` while the number is unconfigured. */
export function whatsappHref(): string | null {
  return buildWhatsAppHref(FOUNDER.whatsappNumber, FOUNDER.message);
}
