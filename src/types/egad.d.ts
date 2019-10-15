interface OptionsI {
  /**
   * Set to `false` to avoid overwriting existing files.
   */
  overwrite?: boolean;
}

interface FileResultI {
  path: string;
  skipped: boolean;
}

export function generate(source: string, dest: string, data?: {}, opts?: OptionsI): Promise<FileResultI[]>
