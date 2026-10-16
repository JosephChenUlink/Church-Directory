/**
 * 從舊版 Excel 名冊匯入會員資料。
 *
 * 用法：
 *   npm run import:excel -- "docs/San Jose Church Member Directory 2017-10-02.xlsx" --dry-run
 *   npm run import:excel -- "docs/San Jose Church Member Directory 2017-10-02.xlsx" --sheet "Directory 2017"
 *
 * 參數：
 *   <檔案路徑>          必填，.xlsx 檔
 *   --sheet <名稱>      工作表名稱，預設用第一個工作表
 *   --dry-run           只分析並列出結果，不寫入資料庫
 *   --label <文字>      來源標籤，會寫進內部備註，預設為檔名
 *   --only-new          只新增資料庫裡還沒有的人，已存在者完全不更動（匯入較舊的名冊時使用）
 *   --note <文字>       附加到每位匯入者內部備註的說明（例如「僅出現在 2016 年名冊」）
 *
 * 支援的欄位（以第一列標題辨識，大小寫不拘）：
 *   Role, Last Name, First Name, （First Name 右邊未命名欄 = 中文姓名）, My Mark,
 *   Gender, Married?, Baptized?, Baptized Date, Birth Year, Status, Phone, Email, Address, Notes
 *
 * 重複執行是安全的：每位會員以「姓＋名」產生舊名冊編號（legacy_id），
 * 已存在者會更新資料，不會重複建檔。
 */
import path from "node:path";
import ExcelJS from "exceljs";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../src/db";
import { auditLogs, churches, members, type NewMember } from "../src/db/schema";

type Row = Record<string, string>;

interface Parsed {
  rowNumber: number;
  legacyId: string;
  values: Omit<NewMember, "churchId" | "legacyId">;
  warnings: string[];
  notes: string[];
  mergedRows: number[];
}

// ---------- 參數 ----------
const args = process.argv.slice(2);
const filePath = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const onlyNew = args.includes("--only-new");
const extraNote = valueOf("--note");
const sheetName = valueOf("--sheet");
const label = valueOf("--label") ?? (filePath ? path.basename(filePath, path.extname(filePath)) : "舊名冊");

function valueOf(flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

// ---------- 儲存格轉文字 ----------
function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((r) => r.text).join("");
    if ("text" in value) return cellText(value.text as ExcelJS.CellValue);
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
    if ("error" in value) return "";
  }
  return String(value).trim();
}

function toDate(value: ExcelJS.CellValue): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  const text = cellText(value);
  const m = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  const us = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  return null;
}

// ---------- 欄位對應 ----------
const HEADER_ALIASES: Record<string, string[]> = {
  role: ["role", "角色"],
  lastName: ["last name", "lastname", "surname", "姓"],
  firstName: ["first name", "firstname", "名"],
  chineseName: ["chinese name", "中文姓名", "中文名"],
  myMark: ["my mark"],
  gender: ["gender", "sex", "性別"],
  married: ["married?", "married", "婚姻"],
  baptized: ["baptized?", "baptized", "受洗"],
  baptizedDate: ["baptized date", "baptism date", "受洗日期"],
  birthYear: ["birth year", "出生年"],
  birthDate: ["birth date", "birthday", "生日"],
  status: ["status", "狀態"],
  phone: ["phone", "電話"],
  email: ["email", "e-mail", "電子郵件"],
  address: ["address", "地址"],
  notes: ["notes", "note", "備註"],
};

function mapHeaders(headerRow: ExcelJS.Row): Record<string, number> {
  const map: Record<string, number> = {};
  const count = headerRow.cellCount;
  for (let col = 1; col <= count; col++) {
    const raw = cellText(headerRow.getCell(col).value).toLowerCase();
    if (!raw) continue;
    // 完全相同優先；否則取最長的前綴別名，避免「Baptized?」搶走「Baptized Date」
    let best: { key: string; score: number } | null = null;
    for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
      for (const alias of aliases) {
        const score = raw === alias ? 1000 : raw.startsWith(alias) ? alias.length : 0;
        if (score > (best?.score ?? 0)) best = { key, score };
      }
    }
    if (best && !map[best.key]) map[best.key] = col;
  }
  // 舊名冊的中文姓名欄沒有標題，位於 First Name 右邊
  if (!map.chineseName && map.firstName) {
    const next = map.firstName + 1;
    if (!cellText(headerRow.getCell(next).value)) map.chineseName = next;
  }
  return map;
}

// ---------- 值的轉換 ----------
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits.startsWith("1")) return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  return raw.trim();
}

/** "Home:(408)1234567\nMobile:(650)7654321\nOffice:..." → { mobile, phone, others[] } */
function parsePhones(text: string): { mobile: string | null; phone: string | null; others: string[] } {
  const result = { mobile: null as string | null, phone: null as string | null, others: [] as string[] };
  for (const line of text.split(/[\n;,]+/).map((l) => l.trim()).filter(Boolean)) {
    const m = line.match(/^([A-Za-z一-鿿 ]+)\s*[:：]\s*(.+)$/);
    const kind = (m?.[1] ?? "").toLowerCase();
    const number = normalizePhone(m?.[2] ?? line);
    if (/mobile|cell|手機/.test(kind) && !result.mobile) result.mobile = number;
    else if (/home|家|住/.test(kind) && !result.phone) result.phone = number;
    else if (!kind && !result.mobile) result.mobile = number;
    else result.others.push(m ? `${m[1].trim()}: ${number}` : number);
  }
  return result;
}

function parseStatus(raw: string): { status: NewMember["membershipStatus"]; note: string | null } {
  const v = raw.toLowerCase();
  if (!v) return { status: "active", note: "舊名冊未標示狀態" };
  if (v.startsWith("active") || v === "正常" || v === "會友") return { status: "active", note: null };
  if (v.startsWith("inactive") || v.includes("久未")) return { status: "inactive", note: null };
  if (v.startsWith("lost") || v.includes("失聯")) return { status: "inactive", note: "舊名冊標示為 Lost（失聯）" };
  if (v.startsWith("visitor") || v.includes("慕道") || v.includes("新朋友")) return { status: "visitor", note: null };
  if (v.startsWith("transfer") || v.includes("轉會")) return { status: "transferred", note: null };
  if (v.startsWith("deceased") || v.includes("安息") || v.includes("過世")) return { status: "deceased", note: null };
  return { status: "active", note: `舊名冊狀態「${raw}」無法對應，暫列為會友` };
}

function parseGender(raw: string): NewMember["gender"] {
  const v = raw.toLowerCase();
  if (v.startsWith("f") || v === "女") return "female";
  if (v.startsWith("m") || v === "男") return "male";
  return null;
}

function yesNo(raw: string): "是" | "否" | null {
  const v = raw.toLowerCase();
  if (!v) return null;
  if (["yes", "y", "true", "是", "有"].includes(v)) return "是";
  if (["no", "n", "false", "否", "無"].includes(v)) return "否";
  return null;
}

const ROLE_LABELS: Record<string, string> = {
  husband: "丈夫",
  wife: "妻子",
  child: "子女",
  son: "兒子",
  daughter: "女兒",
  daugther: "女兒",
  other: "其他",
};

function makeLegacyId(lastName: string, firstName: string, chineseName: string): string {
  const english = `${lastName}|${firstName}`.toLowerCase().replace(/\s+/g, " ").trim();
  return english === "|" ? `zh|${chineseName}` : english;
}

function parseRow(raw: Record<string, ExcelJS.CellValue>, rowNumber: number): Parsed | { skip: string } {
  const row: Row = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, cellText(v)]));
  const lastName = row.lastName ?? "";
  const firstName = row.firstName ?? "";
  const chineseName = row.chineseName ?? "";
  if (!lastName && !firstName && !chineseName) return { skip: "沒有姓名" };

  const warnings: string[] = [];
  if (!lastName || !firstName) warnings.push(`英文姓名不完整（姓：${lastName || "?"}，名：${firstName || "?"}）`);
  const englishName = `${firstName} ${lastName}`.replace(/\s+/g, " ").trim() || null;
  const fullName = chineseName || englishName || "（姓名不詳）";

  const phones = parsePhones(row.phone ?? "");
  const email = (row.email ?? "").toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) warnings.push(`電子郵件格式可疑：${email}`);

  const birthYearRaw = Number(row.birthYear ?? "");
  const birthYear = Number.isInteger(birthYearRaw) && birthYearRaw >= 1900 && birthYearRaw <= new Date().getFullYear() ? birthYearRaw : null;
  if (row.birthYear && row.birthYear !== "0" && !birthYear) warnings.push(`出生年無法辨識：${row.birthYear}`);

  const baptismDate = toDate(raw.baptizedDate ?? null);
  const { status, note: statusNote } = parseStatus(row.status ?? "");

  const notes: string[] = [];
  const role = (row.role ?? "").toLowerCase();
  if (role) notes.push(`家庭角色：${ROLE_LABELS[role] ?? row.role}`);
  const married = yesNo(row.married ?? "");
  if (married) notes.push(`已婚：${married}`);
  const baptized = yesNo(row.baptized ?? "");
  if (baptized) notes.push(`已受洗：${baptized}${baptized === "是" && !baptismDate ? "（日期不詳）" : ""}`);
  if (row.myMark) notes.push(`My Mark：${row.myMark}`);
  if (phones.others.length) notes.push(`其他電話：${phones.others.join("、")}`);
  if (statusNote) notes.push(statusNote);
  if (row.notes) notes.push(`原備註：${row.notes}`);

  return {
    rowNumber,
    legacyId: makeLegacyId(lastName, firstName, chineseName),
    warnings,
    notes,
    mergedRows: [],
    values: {
      fullName,
      englishName,
      gender: parseGender(row.gender ?? ""),
      birthDate: toDate(raw.birthDate ?? null),
      birthYear,
      mobile: phones.mobile,
      phone: phones.phone,
      email: email || null,
      address: row.address || null,
      membershipStatus: status,
      baptismDate,
      internalNotes: null,
    },
  };
}

/** 同一人出現多列時（合併儲存格的續行、或重複登錄），把後面列的非空欄位補進第一筆 */
function mergeInto(target: Parsed, extra: Parsed) {
  const t = target.values as Record<string, unknown>;
  const e = extra.values as Record<string, unknown>;
  for (const key of ["englishName", "gender", "birthDate", "birthYear", "mobile", "phone", "email", "address", "baptismDate"]) {
    if ((t[key] === null || t[key] === undefined) && e[key] !== null && e[key] !== undefined) t[key] = e[key];
  }
  if (target.values.fullName === target.values.englishName && extra.values.fullName !== extra.values.englishName) {
    target.values.fullName = extra.values.fullName;
  }
  // 電話若兩邊都有但不同，保留到備註
  for (const key of ["mobile", "phone"] as const) {
    if (extra.values[key] && target.values[key] && extra.values[key] !== target.values[key]) target.notes.push(`其他電話：${extra.values[key]}`);
  }
  for (const note of extra.notes) if (!target.notes.includes(note)) target.notes.push(note);
  target.warnings.push(...extra.warnings.filter((w) => !target.warnings.includes(w)));
  target.mergedRows.push(extra.rowNumber);
}

// ---------- 主程式 ----------
async function main() {
  if (!filePath) {
    console.error("請提供 Excel 檔案路徑。用法：npm run import:excel -- <檔案.xlsx> [--sheet 名稱] [--dry-run]");
    process.exit(1);
  }
  const slug = process.env.CHURCH_SLUG ?? "default";
  const church = await db.query.churches.findFirst({ where: eq(churches.slug, slug) });
  if (!church) throw new Error(`找不到教會 ${slug}，請先執行 npm run db:seed`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0];
  if (!sheet) throw new Error(`找不到工作表「${sheetName}」。可用：${workbook.worksheets.map((w) => w.name).join("、")}`);

  const headers = mapHeaders(sheet.getRow(1));
  if (!headers.lastName || !headers.firstName) {
    throw new Error(`第一列找不到 Last Name / First Name 欄位。讀到的標題：${sheet.getRow(1).values}`);
  }
  const modes = [dryRun ? "試跑（不寫入）" : null, onlyNew ? "只新增，不更新既有者" : null].filter(Boolean);
  console.log(`檔案：${filePath}\n工作表：${sheet.name}\n教會：${church.name}（${slug}）${modes.length ? `\n模式：${modes.join("、")}` : ""}\n`);

  const parsed: Parsed[] = [];
  const skipped: { rowNumber: number; reason: string }[] = [];
  const seen = new Map<string, Parsed>();

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const raw: Record<string, ExcelJS.CellValue> = {};
    for (const [key, col] of Object.entries(headers)) raw[key] = row.getCell(col).value;

    const result = parseRow(raw, rowNumber);
    if ("skip" in result) {
      if (result.skip !== "沒有姓名") skipped.push({ rowNumber, reason: result.skip });
      return;
    }
    const first = seen.get(result.legacyId);
    if (first) {
      mergeInto(first, result);
      return;
    }
    seen.set(result.legacyId, result);
    parsed.push(result);
  });

  for (const item of parsed) {
    const header = `【舊名冊匯入：${label}】`;
    const merged = item.mergedRows.length ? [`舊名冊中出現多次（第 ${[item.rowNumber, ...item.mergedRows].join("、")} 列），已合併`] : [];
    item.values.internalNotes = [header, ...item.notes, ...merged, ...(extraNote ? [extraNote] : [])].join("\n");
  }

  let inserted = 0;
  let updated = 0;
  let untouched = 0;
  const insertedNames: string[] = [];
  for (const item of parsed) {
    const existing = await db.query.members.findFirst({
      where: and(eq(members.churchId, church.id), eq(members.legacyId, item.legacyId)),
      columns: { id: true, deletedAt: true },
    });
    if (existing && onlyNew) {
      untouched++;
      continue;
    }
    if (!existing) insertedNames.push(item.values.englishName ? `${item.values.fullName}（${item.values.englishName}）` : item.values.fullName);
    if (dryRun) {
      if (existing) updated++;
      else inserted++;
      continue;
    }
    if (existing) {
      await db
        .update(members)
        .set({ ...item.values, updatedAt: new Date() })
        .where(eq(members.id, existing.id));
      updated++;
    } else {
      await db.insert(members).values({ ...item.values, churchId: church.id, legacyId: item.legacyId });
      inserted++;
    }
  }

  if (!dryRun) {
    await db.insert(auditLogs).values({
      churchId: church.id,
      actorName: "匯入腳本",
      action: "member.import",
      entityType: "member",
      details: { file: path.basename(filePath), sheet: sheet.name, inserted, updated, untouched, skipped: skipped.length },
    });
  }

  // ---------- 報告 ----------
  console.log(`新增：${inserted}　更新：${updated}　${onlyNew ? `已存在未更動：${untouched}　` : ""}略過：${skipped.length}`);
  if (onlyNew && insertedNames.length) {
    console.log("\n新增的人：");
    for (const name of insertedNames) console.log(`  ${name}`);
  }
  if (skipped.length) {
    console.log("\n略過的列：");
    for (const s of skipped) console.log(`  第 ${s.rowNumber} 列：${s.reason}`);
  }
  const withWarnings = parsed.filter((p) => p.warnings.length);
  if (withWarnings.length) {
    console.log("\n需要人工確認：");
    for (const p of withWarnings) console.log(`  第 ${p.rowNumber} 列 ${p.values.fullName}：${p.warnings.join("；")}`);
  }
  const mergedItems = parsed.filter((p) => p.mergedRows.length);
  if (mergedItems.length) {
    console.log("\n已合併的重複列：");
    for (const p of mergedItems) console.log(`  ${p.values.fullName}：第 ${[p.rowNumber, ...p.mergedRows].join("、")} 列`);
  }
  const noContact = parsed.filter((p) => !p.values.mobile && !p.values.phone && !p.values.email).length;
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(members)
    .where(and(eq(members.churchId, church.id), isNull(members.deletedAt)));
  console.log(`\n無任何聯絡方式：${noContact} 位`);
  console.log(`資料庫目前會員總數：${total}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("匯入失敗：", error);
    process.exit(1);
  });
