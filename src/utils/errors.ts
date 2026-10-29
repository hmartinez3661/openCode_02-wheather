export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isErrnoException(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error;
}
