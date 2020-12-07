interface AuthorI {
  name?: string;
  email?: string;
  url?: string;
}

export default function stringifyAuthor(author: AuthorI): string;
