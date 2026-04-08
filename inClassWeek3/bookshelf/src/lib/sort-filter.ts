export type SortKey =
  | "date-desc"
  | "date-asc"
  | "title-asc"
  | "title-desc"
  | "author-asc"
  | "author-desc";

export function sortBooks<
  T extends { title: string; author: string; created_at?: string },
>(books: T[], sortKey: SortKey): T[] {
  const sorted = [...books];
  switch (sortKey) {
    case "title-asc":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "title-desc":
      return sorted.sort((a, b) => b.title.localeCompare(a.title));
    case "author-asc":
      return sorted.sort((a, b) => a.author.localeCompare(b.author));
    case "author-desc":
      return sorted.sort((a, b) => b.author.localeCompare(a.author));
    case "date-asc":
      return sorted.sort((a, b) =>
        (a.created_at ?? "").localeCompare(b.created_at ?? "")
      );
    case "date-desc":
    default:
      return sorted.sort((a, b) =>
        (b.created_at ?? "").localeCompare(a.created_at ?? "")
      );
  }
}
