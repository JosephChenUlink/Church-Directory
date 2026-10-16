import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { StorageDriver, StoredObject } from "./types";

const ROOT = path.resolve(process.cwd(), "storage");

function resolveSafe(key: string): string {
  const target = path.resolve(ROOT, key);
  if (!target.startsWith(ROOT + path.sep)) {
    throw new Error("不合法的檔案路徑");
  }
  return target;
}

/** 本機檔案系統儲存，僅供開發測試使用 */
export class LocalStorageDriver implements StorageDriver {
  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    const target = resolveSafe(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, body);
    await fs.writeFile(target + ".meta", contentType, "utf8");
  }

  async get(key: string): Promise<StoredObject | null> {
    const target = resolveSafe(key);
    try {
      const [body, contentType] = await Promise.all([
        fs.readFile(target),
        fs.readFile(target + ".meta", "utf8").catch(() => "application/octet-stream"),
      ]);
      return { body, contentType: contentType.trim() };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async delete(keys: string[]): Promise<void> {
    await Promise.all(
      keys.flatMap((key) => {
        const target = resolveSafe(key);
        return [fs.rm(target, { force: true }), fs.rm(target + ".meta", { force: true })];
      }),
    );
  }
}
