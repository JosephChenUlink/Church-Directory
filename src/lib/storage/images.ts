import "server-only";
import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB（手機原始照片）
export const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export interface ProcessedImage {
  main: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
  contentType: "image/jpeg";
}

/**
 * 將上傳的照片轉正（依 EXIF）、縮小並轉成 JPEG。
 * 主圖最長邊 1600px、縮圖最長邊 320px，大幅節省儲存空間與流量。
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  const base = sharp(input, { failOn: "none" }).rotate();
  const main = await base
    .clone()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  const thumb = await base
    .clone()
    .resize({ width: 320, height: 320, fit: "cover", position: "attention" })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();
  return {
    main: main.data,
    thumb,
    width: main.info.width,
    height: main.info.height,
    contentType: "image/jpeg",
  };
}
