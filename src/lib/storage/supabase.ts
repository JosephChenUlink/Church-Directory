import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { StorageDriver, StoredObject } from "./types";

/**
 * Supabase Storage 私有 bucket。
 * 使用 service role key，只在伺服器端執行；檔案一律透過本系統的
 * /api/files 路由並經權限檢查後才送到瀏覽器，bucket 本身不公開。
 */
export class SupabaseStorageDriver implements StorageDriver {
  private client: SupabaseClient;
  private bucket: string;

  constructor() {
    this.client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    this.bucket = env.supabaseBucket;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(key, body, { contentType, upsert: true });
    if (error) throw new Error(`上傳檔案失敗：${error.message}`);
  }

  async get(key: string): Promise<StoredObject | null> {
    const { data, error } = await this.client.storage.from(this.bucket).download(key);
    if (error) {
      if (/not found|404/i.test(error.message)) return null;
      throw new Error(`讀取檔案失敗：${error.message}`);
    }
    return {
      body: Buffer.from(await data.arrayBuffer()),
      contentType: data.type || "application/octet-stream",
    };
  }

  async delete(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    const { error } = await this.client.storage.from(this.bucket).remove(keys);
    if (error) throw new Error(`刪除檔案失敗：${error.message}`);
  }
}
