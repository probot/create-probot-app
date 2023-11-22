interface Author {
  name?: string;
  email?: string;
  url?: string;
}

export function stringifyAuthor(author: Author): string {
  if (author.url) {
    author.url = author.url.replace(/\/$/, "");
  }

  return (
    (author.name ? author.name : "") +
    (author.email ? ` <${author.email}>` : "") +
    (author.url ? ` (${author.url})` : "")
  );
}
