import type { ActionContext } from "../types/ActionContext.ts";
import { unitSymbol } from "../utils/format.ts";

export async function toggleUnit(context: ActionContext): Promise<void> {
  context.state.unit = context.state.unit === "celsius" ? "fahrenheit" : "celsius";
  await context.persist();
  context.out.line(context.theme.success(`  Unidad ajustada a ${unitSymbol(context.state.unit)}.`));
}
