/**
 * The three product chapters, in scroll order.
 *
 * One list, used by the sticky header (labels + active state) and by the page
 * (section ids). Keeping the order in one place is what makes "the nav highlights
 * whatever is on screen" a single fact rather than three copies of it.
 */
export const SECTIONS = [
  { id: "bread", label: "Bread", nav: "Bread" },
  { id: "buns", label: "Soft Buns", nav: "Soft Buns" },
  { id: "cream-buns", label: "Cream Buns", nav: "Cream Buns" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];
