export interface Output {
  line(message: string): void;
  error(message: string): void;
}

export function createConsoleOutput(
  log: (message: string) => void = console.log,
  errorLog: (message: string) => void = console.error,
): Output {
  return {
    line: (message) => log(message),
    error: (message) => errorLog(message),
  };
}
