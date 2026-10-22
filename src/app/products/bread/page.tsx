import type { Metadata } from "next";
import Link from "next/link";
import { ProductSchema, BreadcrumbSchema, FAQPageSchema } from "@/lib/structuredData";
import { whatsappHref } from "@/lib/founder";

const BREAD_FAQS = [
  {
    question: "What is KV Delight Sandwich Bread?",
    answer:
      "KV Delight Sandwich Bread is a sliced white bread loaf from the KV Delight bakery brand, sold in a sealed green pack. It is one of three bakery products made by KV Delight, alongside Soft Buns and Cream Buns.",
  },
  {
    question: "How can I enquire about KV Delight Sandwich Bread?",
    answer:
      "You can contact Sameer KV, founder of KV Delight, directly via WhatsApp. He handles both retail and business enquiries.",
  },
  {
    question: "What other products does KV Delight make?",
    answer:
      "KV Delight makes three bakery products: Sandwich Bread, Soft Buns (sold eight to a pack), and Cream Buns (sold four to a pack).",
  },
];

export const metadata: Metadata = {
  title: "KV Delight Sandwich Bread",
  description:
    "KV Delight Sandwich Bread is a white bread sliced loaf in a sealed green pack. Browse product details and enquire via WhatsApp.",
  alternates: { canonical: "/products/bread" },
  openGraph: {
    title: "KV Delight Sandwich Bread",
    description:
      "KV Delight Sandwich Bread is a white bread sliced loaf in a sealed green pack. Browse product details and enquire via WhatsApp.",
    images: [
      {
        url: "/assets/brand/packaging-sandwich-bread.webp",
        width: 1024,
        height: 1536,
        alt: "KV Delight Sandwich Bread in its sealed green pack.",
      },
    ],
  },
};

export default function BreadPage() {
  const waHref = whatsappHref();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kvdelight.vercel.app";

  return (
    <>
      <ProductSchema
        name="KV Delight Sandwich Bread"
        description="KV Delight Sandwich Bread is a white bread sliced loaf, sealed in a distinctive green pack. Soft, sliced and ready to use."
        imageUrl="/assets/brand/packaging-sandwich-bread.webp"
        imageAlt="KV Delight Sandwich Bread in its sealed green pack."
        imageWidth={1024}
        imageHeight={1536}
        url="/products/bread"
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Sandwich Bread", url: "/products/bread" },
        ]}
      />
      <FAQPageSchema faqs={BREAD_FAQS} />

      <div className="relative min-h-[100svh] bg-ink px-5 pb-16 pt-24 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-4xl">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex flex-wrap items-center gap-x-2 text-[0.7rem] uppercase tracking-[0.2em] text-cream/50">
              <li><Link href="/" className="hover:text-gold transition-colors">KV Delight</Link></li>
              <li aria-hidden="true"><span>/</span></li>
              <li className="text-gold" aria-current="page">Sandwich Bread</li>
            </ol>
          </nav>

          {/* Header */}
          <p className="eyebrow text-gold/80">KV Delight Product</p>
          <h1 className="display mt-4 text-[clamp(2.2rem,6vw,4rem)] leading-[0.94] text-cream">
            Sandwich Bread
          </h1>
          <p className="mt-2 text-[0.7rem] uppercase tracking-[0.3em] text-gold">
            White Bread
          </p>

          <div className="rule-gold mt-6 h-px w-12" />

          {/* Introduction - AEO-friendly factual summary */}
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-cream/85 sm:text-[1.05rem]">
            KV Delight Sandwich Bread is a white bread sliced loaf from the KV Delight
            bakery brand. It comes in a sealed green pack and is one of three bakery
            product lines from KV Delight, alongside Soft Buns and Cream Buns.
          </p>

          {/* Product image */}
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <figure className="overflow-hidden rounded-sm border border-cream/10 bg-ink-soft">
              <img
                src="/assets/brand/packaging-sandwich-bread.webp"
                alt="KV Delight Sandwich Bread in its sealed green pack, front view."
                width={1024}
                height={1536}
                className="h-auto w-full object-cover"
                loading="eager"
                decoding="async"
              />
              <figcaption className="px-4 py-3 text-[0.7rem] text-cream/50">
                KV Delight Sandwich Bread — sealed pack
              </figcaption>
            </figure>
            <figure className="overflow-hidden rounded-sm border border-cream/10 bg-ink-soft">
              <img
                src="/assets/product/bread-hero-loaf-crop.webp"
                alt="A whole KV Delight sandwich bread loaf on a wooden board, golden-crusted and dusted with flour."
                width={941}
                height={569}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <figcaption className="px-4 py-3 text-[0.7rem] text-cream/50">
                KV Delight sandwich bread loaf
              </figcaption>
            </figure>
          </div>

          {/* Product details */}
          <section className="mt-12" aria-labelledby="bread-details">
            <h2 id="bread-details" className="display text-2xl text-cream sm:text-3xl">
              About KV Delight Sandwich Bread
            </h2>
            <div className="mt-5 space-y-4 text-[0.9rem] leading-relaxed text-cream/75">
              <p>
                KV Delight Sandwich Bread is a sliced white bread loaf, sealed in the
                brand&apos;s signature green pack. The loaf is shown whole in the product
                film before being cut and sealed.
              </p>
              <p>
                The bread is one of three KV Delight product lines. It is available
                alongside Soft Buns (sold in an eight-pack) and Cream Buns (sold in a
                four-pack). All three products carry the same KV Delight branding.
              </p>
            </div>
          </section>

          {/* FAQ section for AEO */}
          <section className="mt-12" aria-labelledby="bread-faq">
            <h2 id="bread-faq" className="display text-2xl text-cream sm:text-3xl">
              Frequently Asked Questions
            </h2>
            <dl className="mt-6 divide-y divide-cream/10">
              <div className="py-5">
                <dt className="text-[0.9rem] font-medium text-gold">
                  What is KV Delight Sandwich Bread?
                </dt>
                <dd className="mt-2 text-[0.88rem] leading-relaxed text-cream/70">
                  KV Delight Sandwich Bread is a sliced white bread loaf from the KV Delight
                  bakery brand, sold in a sealed green pack. It is one of three bakery products
                  made by KV Delight, alongside Soft Buns and Cream Buns.
                </dd>
              </div>
              <div className="py-5">
                <dt className="text-[0.9rem] font-medium text-gold">
                  How can I enquire about KV Delight Sandwich Bread?
                </dt>
                <dd className="mt-2 text-[0.88rem] leading-relaxed text-cream/70">
                  You can contact Sameer KV, founder of KV Delight, directly via WhatsApp
                  using the button below. He handles both retail and business enquiries.
                </dd>
              </div>
              <div className="py-5">
                <dt className="text-[0.9rem] font-medium text-gold">
                  What other products does KV Delight make?
                </dt>
                <dd className="mt-2 text-[0.88rem] leading-relaxed text-cream/70">
                  KV Delight makes three bakery products: Sandwich Bread (this product),
                  <Link href="/products/soft-buns" className="text-gold underline-offset-2 hover:underline"> Soft Buns</Link>
                  {" "}(sold eight to a pack), and
                  <Link href="/products/cream-buns" className="text-gold underline-offset-2 hover:underline"> Cream Buns</Link>
                  {" "}(sold four to a pack).
                </dd>
              </div>
            </dl>
          </section>

          {/* CTA */}
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
                href="/#bread"
                className="inline-flex min-h-[48px] items-center gap-2 rounded-sm border border-cream/20 px-6 text-[0.82rem] text-cream/80 transition-colors hover:border-gold hover:text-gold"
              >
                See the Bread Film
              </Link>
            </div>
          </div>

          {/* Related products */}
          <nav className="mt-12" aria-labelledby="related-products">
            <h2 id="related-products" className="eyebrow text-gold/80">
              More KV Delight Products
            </h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              <li>
                <Link
                  href="/products/soft-buns"
                  className="group block rounded-sm border border-cream/10 bg-ink-soft p-4 transition-colors hover:border-gold/40"
                >
                  <p className="text-[0.7rem] uppercase tracking-[0.2em] text-gold/70">Product</p>
                  <p className="mt-1 text-[1rem] text-cream group-hover:text-gold transition-colors">Soft Buns</p>
                  <p className="mt-1 text-[0.8rem] text-cream/55">Eight to a pack</p>
                </Link>
              </li>
              <li>
                <Link
                  href="/products/cream-buns"
                  className="group block rounded-sm border border-cream/10 bg-ink-soft p-4 transition-colors hover:border-gold/40"
                >
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
