type Painter = (text: string) => string;

const RESET = "\x1b[0m";

export interface Theme {
  readonly enabled: boolean;
  readonly menu: Painter;
  readonly title: Painter;
  readonly temperature: Painter;
  readonly success: Painter;
  readonly error: Painter;
  readonly warning: Painter;
  readonly secondary: Painter;
  readonly prompt: Painter;
}

const identity: Painter = (text) => text;

export const plainTheme: Theme = {
  enabled: false,
  menu: identity,
  title: identity,
  temperature: identity,
  success: identity,
  error: identity,
  warning: identity,
  secondary: identity,
  prompt: identity,
};

function painter(enabled: boolean, code: string): Painter {
  if (!enabled) return identity;
  return (text) => `\x1b[${code}m${text}${RESET}`;
}

export function createTheme(options: { enabled: boolean }): Theme {
  return {
    enabled: options.enabled,
    menu: painter(options.enabled, "36"),
    title: painter(options.enabled, "1;36"),
    temperature: painter(options.enabled, "33"),
    success: painter(options.enabled, "32"),
    error: painter(options.enabled, "31"),
    warning: painter(options.enabled, "33"),
    secondary: painter(options.enabled, "2"),
    prompt: painter(options.enabled, "36"),
  };
}

export function supportsColor(
  env: Record<string, string | undefined> = process.env,
  isTTY: boolean | undefined = process.stdout.isTTY,
): boolean {
  const force = env.FORCE_COLOR;
  if (force !== undefined) {
    return force !== "0" && force.toLowerCase() !== "false";
  }

  if (env.NO_COLOR !== undefined && env.NO_COLOR !== "") return false;
  if (env.TERM === "dumb") return false;

  return isTTY === true;
}
