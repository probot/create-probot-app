export function guessAuthor(): string;

export function guessEmail(): Promise<string | void>;

export function guessGitHubUsername(email: string): Promise<string | void>;
