import Link from "next/link";

const chapters = [
  { id: "bread", label: "Bread", state: "current" as const },
  { id: "buns", label: "Soft Buns", state: "soon" as const },
  { id: "cream-buns", label: "Cream Buns", state: "soon" as const },
];

export default function Header() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-5 sm:px-8 sm:py-6">
        <Link
          href="/"
          className="pointer-events-auto flex items-center gap-3"
          aria-label="KV Delight — home"
        >
          {/* Supplied logo reference, unchanged. Awaiting the original master mark. */}
          <img
            src="/assets/brand/kv-delight-logo-reference.webp"
            alt=""
            width={56}
            height={38}
            className="h-9 w-auto rounded-[3px] bg-cream p-[2px] sm:h-10"
          />
          <span className="hidden text-[0.66rem] uppercase tracking-[0.34em] text-cream/70 sm:block">
            KV Delight
          </span>
        </Link>

        <nav aria-label="Product chapters" className="pointer-events-auto">
          <ul className="flex items-center gap-4 sm:gap-7">
            {chapters.map((c) => (
              <li key={c.id}>
                {c.state === "current" ? (
                  <a
                    href="#bread"
                    className="text-[0.62rem] uppercase tracking-[0.28em] text-cream transition-opacity hover:opacity-70 sm:text-[0.68rem]"
                  >
                    {c.label}
                  </a>
                ) : (
                  <span
                    aria-disabled="true"
                    title="Next in the film — not built yet"
                    className="text-[0.62rem] uppercase tracking-[0.28em] text-cream/25 sm:text-[0.68rem]"
                  >
                    {c.label}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
