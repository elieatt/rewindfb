export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Current time in Unix seconds. */
export const nowSec = (): number => Math.floor(Date.now() / 1000);

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
