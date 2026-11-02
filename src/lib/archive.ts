import fs from "node:fs";
import path from "node:path";

/**
 * 封面和快照的落盘位置。
 *
 * 跟 nav.db 放在同一个 data/ 下：standalone 启动时工作目录会被换掉，
 * 不能写相对路径。data/ 已在 .gitignore 里，这些文件不进仓库，也不进 SQLite。
 */

export function archiveRoot(): string {
  const configured = process.env.NAV_ARCHIVE_DIR?.trim();
  if (configured) return configured;

  const dbPath = process.env.NAV_DB_PATH?.trim();
  if (dbPath) return path.dirname(dbPath);

  return path.join(process.cwd(), "data");
}

function filePath(kind: "covers" | "snapshots", id: number, ext: string): string {
  return path.join(archiveRoot(), kind, `${id}.${ext}`);
}

export function coverPath(id: number): string {
  return filePath("covers", id, "img");
}

export function coverTypePath(id: number): string {
  return filePath("covers", id, "type");
}

export function snapshotPath(id: number): string {
  return filePath("snapshots", id, "html");
}

export function hasCover(id: number): boolean {
  return fs.existsSync(coverPath(id));
}

export function hasSnapshot(id: number): boolean {
  return fs.existsSync(snapshotPath(id));
}

export function readCover(id: number): { body: Buffer; contentType: string } | null {
  const file = coverPath(id);
  if (!fs.existsSync(file)) return null;

  let contentType = "image/jpeg";
  try {
    const stored = fs.readFileSync(coverTypePath(id), "utf8").trim();
    if (stored.startsWith("image/")) contentType = stored;
  } catch {
    // 类型文件丢了不影响把图读出来
  }

  return { body: fs.readFileSync(file), contentType };
}

export function writeCover(id: number, body: Buffer, contentType: string): void {
  fs.mkdirSync(path.dirname(coverPath(id)), { recursive: true });
  fs.writeFileSync(coverPath(id), body);
  fs.writeFileSync(coverTypePath(id), contentType);
}

export function readSnapshot(id: number): string | null {
  const file = snapshotPath(id);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, "utf8");
}

export function writeSnapshot(id: number, html: string): void {
  fs.mkdirSync(path.dirname(snapshotPath(id)), { recursive: true });
  fs.writeFileSync(snapshotPath(id), html);
}

/** 删除这一条的封面和快照。文件不存在不算错。 */
export function removeArchive(id: number): void {
  for (const file of [coverPath(id), coverTypePath(id), snapshotPath(id)]) {
    fs.rmSync(file, { force: true });
  }
}
