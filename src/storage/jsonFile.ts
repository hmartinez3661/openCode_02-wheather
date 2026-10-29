import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { isErrnoException } from "../utils/errors.ts";

export class JsonFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JsonFileError";
  }
}

/** Devuelve undefined cuando el archivo no existe. */
export async function readJsonFile(path: string): Promise<unknown | undefined> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    if (isErrnoException(error) && error.code === "ENOENT") return undefined;
    throw error;
  }

  try {
    return JSON.parse(raw.replace(/^\uFEFF/, "")) as unknown;
  } catch {
    throw new JsonFileError("no contiene JSON válido");
  }
}

export async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });

  const temporaryPath = `${path}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporaryPath, path);
}
