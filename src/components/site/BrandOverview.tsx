import Link from "next/link";
import { FAQPageSchema, ItemListSchema } from "@/lib/structuredData";

const HOMEPAGE_FAQS = [
  {
    question: "What bakery products does KV Delight offer?",
    answer:
      "KV Delight produces three distinct bakery product lines: KV Delight Sandwich Bread (a sliced white loaf sealed in a distinctive green pack), KV Delight Soft Buns (eight soft white buns packed in clear film), and KV Delight Cream Buns (four soft buns filled with sweet piped cream).",
  },
  {
    question: "Who founded KV Delight?",
    answer:
      "KV Delight was founded by Sameer KV, who leads the brand's bakery production, recipe standards, and trade partnerships.",
  },
  {
    question: "How can I place trade, wholesale, or product enquiries with KV Delight?",
    answer:
      "You can connect directly with founder Sameer KV via WhatsApp (+91 94951 46738) to discuss retail stocking, bulk bakery supply, distribution, or product details.",
  },
  {
    question: "Where can I view detailed information about each KV Delight product?",
    answer:
      "Detailed product specifications, packaging photography, and direct WhatsApp enquiry links are available on the dedicated product pages for Sandwich Bread, Soft Buns, and Cream Buns.",
  },
];

const CATALOG_ITEMS = [
  {
    name: "KV Delight Sandwich Bread",
    url: "/products/bread",
    description: "Sliced white bread loaf in a sealed green pack.",
    image: "/assets/brand/packaging-sandwich-bread.webp",
  },
  {
    name: "KV Delight Soft Buns",
    url: "/products/soft-buns",
    description: "Soft white buns sold eight to a pack.",
    image: "/assets/brand/packaging-buns-8pack.webp",
  },
  {
    name: "KV Delight Cream Buns",
    url: "/products/cream-buns",
    description: "Cream-filled soft buns sold four to a pack.",
    image: "/assets/brand/packaging-cream-bun-4pack.webp",
  },
];

export default function BrandOverview() {
  return (
    <>
      <FAQPageSchema faqs={HOMEPAGE_FAQS} />
      <ItemListSchema items={CATALOG_ITEMS} />

      <section
        id="about-kv-delight"
        aria-labelledby="brand-overview-heading"
        className="relative isolate overflow-hidden bg-ink-deep border-t border-cream/10 px-5 py-16 sm:px-10 sm:py-24"
      >
        {/* Subtle warm wash background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(100%_70%_at_50%_-10%,rgba(230,180,92,0.08),transparent_65%)]"
        />

        <div className="relative mx-auto max-w-[1200px]">
          {/* Header */}
          <div className="max-w-2xl">
            <p className="eyebrow text-gold/85">Bakery Craftsmanship · AEO & Knowledge</p>
            <h2
              id="brand-overview-heading"
              className="display mt-3 text-[clamp(1.9rem,4vw,3.2rem)] leading-[0.98] text-cream"
            >
              KV Delight Bakery Products & Brand Overview
            </h2>
            <div className="rule-gold mt-5 h-px w-14" />
            <p className="mt-5 text-[0.95rem] leading-relaxed text-cream/75 sm:text-[1.02rem]">
              KV Delight is a bakery brand founded by <strong>Sameer KV</strong>, dedicated to quality,
              freshness, and everyday delight. The bakery product family includes sliced Sandwich Bread,
              Soft Buns, and Cream Buns — each crafted with care and packaged for freshness.
            </p>
          </div>

          {/* Product cards grid for SEO & deep linking */}
          <div className="mt-12">
            <h3 className="eyebrow text-[0.62rem] text-cream/50">Explore The Product Collection</h3>
            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              {/* Product 1 */}
              <Link
                href="/products/bread"
                className="group relative flex flex-col justify-between overflow-hidden rounded-sm border border-cream/10 bg-ink-soft/70 p-6 transition-colors hover:border-gold/50"
              >
                <div>
                  <p className="eyebrow text-[0.58rem] text-gold/75">01 · Sliced Loaf</p>
                  <h4 className="display mt-2 text-2xl text-cream transition-colors group-hover:text-gold">
                    Sandwich Bread
                  </h4>
                  <p className="mt-2 text-[0.84rem] leading-relaxed text-cream/65">
                    White sliced bread loaf, sealed in our signature green pack. Ready for morning toast,
                    sandwiches, and fresh snacks.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.2em] text-gold group-hover:underline">
                  <span>Product details</span>
                  <span aria-hidden="true">→</span>
                </div>
              </Link>

              {/* Product 2 */}
              <Link
                href="/products/soft-buns"
                className="group relative flex flex-col justify-between overflow-hidden rounded-sm border border-cream/10 bg-ink-soft/70 p-6 transition-colors hover:border-gold/50"
              >
                <div>
                  <p className="eyebrow text-[0.58rem] text-gold/75">02 · 8-Pack</p>
                  <h4 className="display mt-2 text-2xl text-cream transition-colors group-hover:text-gold">
                    Soft Buns
                  </h4>
                  <p className="mt-2 text-[0.84rem] leading-relaxed text-cream/65">
                    Eight soft white buns sealed in clear film. Baked for pillow-soft texture, gentle sweetness,
                    and everyday enjoyment.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.2em] text-gold group-hover:underline">
                  <span>Product details</span>
                  <span aria-hidden="true">→</span>
                </div>
              </Link>

              {/* Product 3 */}
              <Link
                href="/products/cream-buns"
                className="group relative flex flex-col justify-between overflow-hidden rounded-sm border border-cream/10 bg-ink-soft/70 p-6 transition-colors hover:border-gold/50"
              >
                <div>
                  <p className="eyebrow text-[0.58rem] text-gold/75">03 · 4-Pack</p>
                  <h4 className="display mt-2 text-2xl text-cream transition-colors group-hover:text-gold">
                    Cream Buns
                  </h4>
                  <p className="mt-2 text-[0.84rem] leading-relaxed text-cream/65">
                    Four soft buns generously filled with sweet piped cream. A classic bakery indulgence sealed
                    for freshness.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.2em] text-gold group-hover:underline">
                  <span>Product details</span>
                  <span aria-hidden="true">→</span>
                </div>
              </Link>
            </div>
          </div>

          {/* Frequently Asked Questions */}
          <div className="mt-16 sm:mt-20">
            <h3 className="display text-2xl text-cream sm:text-3xl">
              Frequently Asked Questions (FAQ)
            </h3>
            <p className="mt-2 text-[0.84rem] text-cream/55">
              Verified answers about KV Delight bakery products, founder Sameer KV, and trade enquiries.
            </p>

            <dl className="mt-8 divide-y divide-cream/10 border-y border-cream/10">
              {HOMEPAGE_FAQS.map((faq, index) => (
                <div key={index} className="py-6">
                  <dt className="text-base font-medium text-gold sm:text-[1.05rem]">
                    {faq.question}
                  </dt>
                  <dd className="mt-3 max-w-3xl text-[0.9rem] leading-relaxed text-cream/75 sm:text-[0.95rem]">
                    {faq.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
    </>
  );
}
