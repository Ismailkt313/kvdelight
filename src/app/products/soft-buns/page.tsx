import type { Metadata } from "next";
import Link from "next/link";
import { ProductSchema, BreadcrumbSchema, FAQPageSchema } from "@/lib/structuredData";
import { whatsappHref } from "@/lib/founder";

const SOFT_BUNS_FAQS = [
  {
    question: "What are KV Delight Soft Buns?",
    answer:
      "KV Delight Soft Buns are soft white buns from the KV Delight bakery brand, sold eight to a clear film pack. They are one of three product lines from KV Delight.",
  },
  {
    question: "How many buns are in a KV Delight Soft Buns pack?",
    answer: "KV Delight Soft Buns are sold eight to a pack.",
  },
  {
    question: "How can I enquire about KV Delight Soft Buns?",
    answer:
      "Contact Sameer KV, founder of KV Delight, directly via WhatsApp for product, wholesale, or business enquiries.",
  },
];

export const metadata: Metadata = {
  title: "KV Delight Soft Buns",
  description:
    "KV Delight Soft Buns are soft white buns sold eight to a pack. Browse product details and contact Sameer KV for enquiries.",
  alternates: { canonical: "/products/soft-buns" },
  openGraph: {
    title: "KV Delight Soft Buns",
    description:
      "KV Delight Soft Buns are soft white buns sold eight to a pack. Browse product details and contact Sameer KV for enquiries.",
    images: [
      {
        url: "/assets/brand/packaging-buns-8pack.webp",
        width: 1536,
        height: 1024,
        alt: "KV Delight soft buns in their sealed eight-pack.",
      },
    ],
  },
};

export default function SoftBunsPage() {
  const waHref = whatsappHref();

  return (
    <>
      <ProductSchema
        name="KV Delight Soft Buns"
        description="KV Delight Soft Buns are soft white buns, sold eight to a clear film pack. Part of the KV Delight bakery product range."
        imageUrl="/assets/brand/packaging-buns-8pack.webp"
        imageAlt="KV Delight soft buns, eight in a clear film pack."
        imageWidth={1536}
        imageHeight={1024}
        url="/products/soft-buns"
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Soft Buns", url: "/products/soft-buns" },
        ]}
      />
      <FAQPageSchema faqs={SOFT_BUNS_FAQS} />

      <div className="relative min-h-[100svh] bg-ink px-5 pb-16 pt-24 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-4xl">

          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex flex-wrap items-center gap-x-2 text-[0.7rem] uppercase tracking-[0.2em] text-cream/50">
              <li><Link href="/" className="hover:text-gold transition-colors">KV Delight</Link></li>
              <li aria-hidden="true"><span>/</span></li>
              <li className="text-gold" aria-current="page">Soft Buns</li>
            </ol>
          </nav>

          <p className="eyebrow text-gold/80">KV Delight Product</p>
          <h1 className="display mt-4 text-[clamp(2.2rem,6vw,4rem)] leading-[0.94] text-cream">
            Soft Buns
          </h1>
          <p className="mt-2 text-[0.7rem] uppercase tracking-[0.3em] text-gold">
            Eight to a pack
          </p>

          <div className="rule-gold mt-6 h-px w-12" />

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-cream/85 sm:text-[1.05rem]">
            KV Delight Soft Buns are soft white buns from the KV Delight bakery brand.
            They come eight to a clear film pack and are one of three bakery product
            lines from KV Delight, alongside Sandwich Bread and Cream Buns.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <figure className="overflow-hidden rounded-sm border border-cream/10 bg-ink-soft">
              <img
                src="/assets/brand/packaging-buns-8pack.webp"
                alt="KV Delight soft buns in their sealed clear pack, eight buns visible."
                width={1536}
                height={1024}
                className="h-auto w-full object-cover"
                loading="eager"
                decoding="async"
              />
              <figcaption className="px-4 py-3 text-[0.7rem] text-cream/50">
                KV Delight Soft Buns — eight-pack
              </figcaption>
            </figure>
            <div className="flex flex-col gap-4">
              <div className="rounded-sm border border-cream/10 bg-ink-soft p-6">
                <p className="eyebrow text-gold/80">Pack size</p>
                <p className="mt-2 text-[1.5rem] text-cream">8 buns per pack</p>
              </div>
              <div className="rounded-sm border border-cream/10 bg-ink-soft p-6">
                <p className="eyebrow text-gold/80">Product type</p>
                <p className="mt-2 text-[1rem] text-cream">Soft white buns</p>
              </div>
            </div>
          </div>

          <section className="mt-12" aria-labelledby="buns-details">
            <h2 id="buns-details" className="display text-2xl text-cream sm:text-3xl">
              About KV Delight Soft Buns
            </h2>
            <div className="mt-5 space-y-4 text-[0.9rem] leading-relaxed text-cream/75">
              <p>
                KV Delight Soft Buns are soft white buns sold eight to a clear film pack.
                In the KV Delight product film, a single bun is shown being pressed, split
                open to reveal pale soft crumb, and then sealed eight to a pack.
              </p>
              <p>
                Soft Buns are one of three KV Delight product lines. The range also
                includes Sandwich Bread (a sliced white loaf) and Cream Buns (filled buns
                sold four to a pack).
              </p>
            </div>
          </section>

          <section className="mt-12" aria-labelledby="buns-faq">
            <h2 id="buns-faq" className="display text-2xl text-cream sm:text-3xl">
              Frequently Asked Questions
            </h2>
            <dl className="mt-6 divide-y divide-cream/10">
              <div className="py-5">
                <dt className="text-[0.9rem] font-medium text-gold">
                  What are KV Delight Soft Buns?
                </dt>
                <dd className="mt-2 text-[0.88rem] leading-relaxed text-cream/70">
                  KV Delight Soft Buns are soft white buns from the KV Delight bakery brand,
                  sold eight to a clear film pack. They are one of three product lines from
                  KV Delight.
                </dd>
              </div>
              <div className="py-5">
                <dt className="text-[0.9rem] font-medium text-gold">
                  How many buns are in a KV Delight Soft Buns pack?
                </dt>
                <dd className="mt-2 text-[0.88rem] leading-relaxed text-cream/70">
                  KV Delight Soft Buns are sold eight to a pack.
                </dd>
              </div>
              <div className="py-5">
                <dt className="text-[0.9rem] font-medium text-gold">
                  How can I enquire about KV Delight Soft Buns?
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
                href="/#buns"
                className="inline-flex min-h-[48px] items-center gap-2 rounded-sm border border-cream/20 px-6 text-[0.82rem] text-cream/80 transition-colors hover:border-gold hover:text-gold"
              >
                See the Soft Buns Film
              </Link>
            </div>
          </div>

          <nav className="mt-12" aria-labelledby="buns-related">
            <h2 id="buns-related" className="eyebrow text-gold/80">More KV Delight Products</h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              <li>
                <Link href="/products/bread" className="group block rounded-sm border border-cream/10 bg-ink-soft p-4 transition-colors hover:border-gold/40">
                  <p className="text-[0.7rem] uppercase tracking-[0.2em] text-gold/70">Product</p>
                  <p className="mt-1 text-[1rem] text-cream group-hover:text-gold transition-colors">Sandwich Bread</p>
                  <p className="mt-1 text-[0.8rem] text-cream/55">Sliced white loaf</p>
                </Link>
              </li>
              <li>
                <Link href="/products/cream-buns" className="group block rounded-sm border border-cream/10 bg-ink-soft p-4 transition-colors hover:border-gold/40">
                  <p className="text-[0.7rem] uppercase tracking-[0.2em] text-gold/70">Product</p>
                  <p className="mt-1 text-[1rem] text-cream group-hover:text-gold transition-colors">Cream Buns</p>
                  <p className="mt-1 text-[0.8rem] text-cream/55">Four to a pack</p>
                </Link>
              </li>
            </ul>
          </nav>

        </div>
      </div>
    </>
  );
}
