interface Options {
  /**
   * Set to `false` to avoid overwriting existing files.
   */
  overwrite?: boolean;
}

interface FileResult {
  path: string;
  skipped: boolean;
}

export function generate(
  source: string,
  dest: string,
  data?: Record<string, unknown>,
  opts?: Options,
): Promise<FileResult[]>;
