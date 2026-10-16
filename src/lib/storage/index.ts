import "server-only";
import { env } from "@/lib/env";
import { LocalStorageDriver } from "./local";
import { SupabaseStorageDriver } from "./supabase";
import type { StorageDriver } from "./types";

let driver: StorageDriver | undefined;

export function getStorage(): StorageDriver {
  if (!driver) {
    driver = env.storageDriver === "supabase" ? new SupabaseStorageDriver() : new LocalStorageDriver();
  }
  return driver;
}

export type { StorageDriver, StoredObject } from "./types";
