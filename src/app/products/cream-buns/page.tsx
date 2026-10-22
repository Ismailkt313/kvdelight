import type { Metadata } from "next";
import Link from "next/link";
import { ProductSchema, BreadcrumbSchema, FAQPageSchema } from "@/lib/structuredData";
import { whatsappHref } from "@/lib/founder";

const CREAM_BUNS_FAQS = [
  {
    question: "What are KV Delight Cream Buns?",
    answer:
      "KV Delight Cream Buns are cream-filled soft buns from the KV Delight bakery brand, sold four to a sealed pack. They are one of three bakery product lines from KV Delight.",
  },
  {
    question: "How many cream buns are in a KV Delight pack?",
    answer: "KV Delight Cream Buns are sold four to a pack.",
  },
  {
    question: "What filling is in KV Delight Cream Buns?",
    answer:
      "KV Delight Cream Buns contain a cream filling piped inside a soft bun. For specific ingredient details, contact Sameer KV via WhatsApp.",
  },
];

export const metadata: Metadata = {
  title: "KV Delight Cream Buns",
  description:
    "KV Delight Cream Buns are cream-filled soft buns sold four to a pack. Browse product details and contact Sameer KV for enquiries.",
  alternates: { canonical: "/products/cream-buns" },
  openGraph: {
    title: "KV Delight Cream Buns",
    description:
      "KV Delight Cream Buns are cream-filled soft buns sold four to a pack. Browse product details and contact Sameer KV for enquiries.",
    images: [
      {
        url: "/assets/brand/packaging-cream-bun-4pack.webp",
        width: 1024,
        height: 1536,
        alt: "KV Delight cream buns in their sealed four-pack.",
      },
    ],
  },
};

export default function CreamBunsPage() {
  const waHref = whatsappHref();

  return (
    <>
      <ProductSchema
        name="KV Delight Cream Buns"
        description="KV Delight Cream Buns are cream-filled soft buns, sold four to a pack. The bun is opened, piped with cream, and sealed — visible in the KV Delight product film."
        imageUrl="/assets/brand/packaging-cream-bun-4pack.webp"
        imageAlt="KV Delight cream buns, four to a pack."
        imageWidth={1024}
        imageHeight={1536}
        url="/products/cream-buns"
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Cream Buns", url: "/products/cream-buns" },
        ]}
      />
      <FAQPageSchema faqs={CREAM_BUNS_FAQS} />

      <div className="relative min-h-[100svh] bg-ink px-5 pb-16 pt-24 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-4xl">

          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex flex-wrap items-center gap-x-2 text-[0.7rem] uppercase tracking-[0.2em] text-cream/50">
              <li><Link href="/" className="hover:text-gold transition-colors">KV Delight</Link></li>
              <li aria-hidden="true"><span>/</span></li>
              <li className="text-gold" aria-current="page">Cream Buns</li>
            </ol>
          </nav>

          <p className="eyebrow text-gold/80">KV Delight Product</p>
          <h1 className="display mt-4 text-[clamp(2.2rem,6vw,4rem)] leading-[0.94] text-cream">
            Cream Buns
          </h1>
          <p className="mt-2 text-[0.7rem] uppercase tracking-[0.3em] text-gold">
            Four to a pack · Cream-filled
          </p>

          <div className="rule-gold mt-6 h-px w-12" />

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-cream/85 sm:text-[1.05rem]">
            KV Delight Cream Buns are cream-filled soft buns from the KV Delight bakery
            brand. They come four to a pack and are one of three bakery product lines
            from KV Delight, alongside Sandwich Bread and Soft Buns.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <figure className="overflow-hidden rounded-sm border border-cream/10 bg-ink-soft">
              <img
                src="/assets/brand/packaging-cream-bun-4pack.webp"
                alt="KV Delight cream buns in their sealed four-pack."
                width={1024}
                height={1536}
                className="h-auto w-full object-cover"
                loading="eager"
                decoding="async"
              />
              <figcaption className="px-4 py-3 text-[0.7rem] text-cream/50">
                KV Delight Cream Buns — four-pack
              </figcaption>
            </figure>
            <figure className="overflow-hidden rounded-sm border border-cream/10 bg-ink-soft">
              <img
                src="/assets/product/cream-bun-cross-section.webp"
                alt="A KV Delight cream bun cut in half, showing thick cream piped between the two halves."
                width={1536}
                height={1024}
                className="h-auto w-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <figcaption className="px-4 py-3 text-[0.7rem] text-cream/50">
                KV Delight Cream Bun — cross-section, cream visible
              </figcaption>
            </figure>
          </div>

          <section className="mt-12" aria-labelledby="cream-details">
            <h2 id="cream-details" className="display text-2xl text-cream sm:text-3xl">
              About KV Delight Cream Buns
            </h2>
            <div className="mt-5 space-y-4 text-[0.9rem] leading-relaxed text-cream/75">
              <p>
                KV Delight Cream Buns are soft buns filled with cream, sold four to a
                sealed pack. In the KV Delight product film, a single cream bun is shown
                opening along its long axis, being piped with cream, closing, and then
                sealed four to a pack.
              </p>
              <p>
                Cream Buns are one of three KV Delight product lines. The range also
                includes Sandwich Bread (a sliced white loaf) and Soft Buns (sold eight
                to a pack).
              </p>
            </div>
          </section>

          <section className="mt-12" aria-labelledby="cream-faq">
            <h2 id="cream-faq" className="display text-2xl text-cream sm:text-3xl">
              Frequently Asked Questions
            </h2>
            <dl className="mt-6 divide-y divide-cream/10">
              <div className="py-5">
                <dt className="text-[0.9rem] font-medium text-gold">
                  What are KV Delight Cream Buns?
                </dt>
                <dd className="mt-2 text-[0.88rem] leading-relaxed text-cream/70">
                  KV Delight Cream Buns are cream-filled soft buns from the KV Delight
                  bakery brand, sold four to a sealed pack. They are one of three bakery
                  product lines from KV Delight.
                </dd>
              </div>
              <div className="py-5">
                <dt className="text-[0.9rem] font-medium text-gold">
                  How many cream buns are in a KV Delight pack?
                </dt>
                <dd className="mt-2 text-[0.88rem] leading-relaxed text-cream/70">
                  KV Delight Cream Buns are sold four to a pack.
                </dd>
              </div>
              <div className="py-5">
                <dt className="text-[0.9rem] font-medium text-gold">
                  What filling is in KV Delight Cream Buns?
                </dt>
                <dd className="mt-2 text-[0.88rem] leading-relaxed text-cream/70">
                  KV Delight Cream Buns contain a cream filling piped inside a soft bun.
                  For specific ingredient details, contact Sameer KV via WhatsApp.
                </dd>
              </div>
              <div className="py-5">
                <dt className="text-[0.9rem] font-medium text-gold">
                  How can I enquire about KV Delight Cream Buns?
                </dt>
                <dd className="mt-2 text-[0.88rem] leading-relaxed text-cream/70">
                  Contact Sameer KV, founder of KV Delight, directly via WhatsApp for
                  product, wholesale, or business enquiries.
                </dd>
              </div>
            </dl>
          </section>

          <div className="mt-12 rounded-sm border border-cream/10 bg-ink-soft p-6">
            <p className="eyebrow text-gold/80">Enquire about this product</p>
            <p className="mt-3 text-[0.9rem] leading-relaxed text-cream/75">
              For product details, wholesale, or business enquiries, contact Sameer KV
              directly via WhatsApp.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {waHref ? (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[48px] items-center gap-3 rounded-sm bg-brand-green px-6 text-[0.82rem] font-medium text-cream ring-1 ring-inset ring-gold/25 transition-colors hover:bg-[#187a45]"
                >
                  Chat with Sameer on WhatsApp
                </a>
              ) : null}
              <Link
                href="/#cream-buns"
                className="inline-flex min-h-[48px] items-center gap-2 rounded-sm border border-cream/20 px-6 text-[0.82rem] text-cream/80 transition-colors hover:border-gold hover:text-gold"
              >
                See the Cream Buns Film
              </Link>
            </div>
          </div>

          <nav className="mt-12" aria-labelledby="cream-related">
            <h2 id="cream-related" className="eyebrow text-gold/80">More KV Delight Products</h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              <li>
                <Link href="/products/bread" className="group block rounded-sm border border-cream/10 bg-ink-soft p-4 transition-colors hover:border-gold/40">
                  <p className="text-[0.7rem] uppercase tracking-[0.2em] text-gold/70">Product</p>
                  <p className="mt-1 text-[1rem] text-cream group-hover:text-gold transition-colors">Sandwich Bread</p>
                  <p className="mt-1 text-[0.8rem] text-cream/55">Sliced white loaf</p>
                </Link>
              </li>
              <li>
                <Link href="/products/soft-buns" className="group block rounded-sm border border-cream/10 bg-ink-soft p-4 transition-colors hover:border-gold/40">
                  <p className="text-[0.7rem] uppercase tracking-[0.2em] text-gold/70">Product</p>
                  <p className="mt-1 text-[1rem] text-cream group-hover:text-gold transition-colors">Soft Buns</p>
                  <p className="mt-1 text-[0.8rem] text-cream/55">Eight to a pack</p>
                </Link>
              </li>
            </ul>
          </nav>

        </div>
      </div>
    </>
  );
}
