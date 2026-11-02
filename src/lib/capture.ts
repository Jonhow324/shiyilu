import { getBookmark } from "./bookmarks";
import { getDb } from "./db";
import {
  hasCover,
  hasSnapshot,
  removeArchive,
  writeCover,
  writeSnapshot,
} from "./archive";
import { coverUpstreamUrl } from "./cover";
import { extractParagraphs, renderSnapshot } from "./snapshot";

/**
 * 写入之后的后台抓取：封面问 mShots，正文问原站。
 *
 * 两边互不影响。抓取不挡住写入响应，失败只是磁盘上没有文件。
 * 同一条 Bookmark 不会并发抓两次。
 */

const MIN_COVER_BYTES = 8192;
const COVER_ATTEMPTS = 4;
const COVER_RETRY_MS = 4000;

/** 测试把重试间隔收成 0。生产保持 4 秒。 */
export function coverRetryDelay(): number {
  const override = process.env.NAV_COVER_RETRY_MS;
  return override === undefined ? COVER_RETRY_MS : Number(override);
}
const COVER_TIMEOUT_MS = 8000;
const SNAPSHOT_TIMEOUT_MS = 10000;
const SNAPSHOT_MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;

const inFlight = new Set<number>();

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 合格封面：2xx、图片类型、不少于 8KB。mShots 的「正在生成」占位图过不了这条。 */
export function isRealCover(status: number, contentType: string, byteLength: number): boolean {
  return status >= 200 && status < 300 && contentType.startsWith("image/") && byteLength >= MIN_COVER_BYTES;
}

async function fetchCoverOnce(url: string, fetchImpl: typeof fetch): Promise<boolean> {
  const response = await fetchImpl(coverUpstreamUrl(url), {
    signal: AbortSignal.timeout(COVER_TIMEOUT_MS),
    cache: "no-store",
  });

  const contentType = (response.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  const body = Buffer.from(await response.arrayBuffer());

  if (!isRealCover(response.status, contentType, body.byteLength)) return false;

  const bookmark = getBookmarkByUrl(url);
  if (!bookmark) return false;
  writeCover(bookmark.id, body, contentType || "image/jpeg");
  return true;
}

function getBookmarkByUrl(url: string): { id: number } | null {
  const row = getDb().prepare("SELECT id FROM bookmarks WHERE url = ?").get(url) as
    | { id: number }
    | undefined;
  return row ?? null;
}

/** 问 mShots，最多四次。占位图不落盘。 */
export async function captureCover(
  id: number,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const bookmark = getBookmark(id);
  if (!bookmark) return;

  for (let attempt = 0; attempt < COVER_ATTEMPTS; attempt += 1) {
    try {
      if (await fetchCoverOnce(bookmark.url, fetchImpl)) return;
    } catch {
      // 超时或网络错误，跟占位图一样再试
    }
    if (attempt < COVER_ATTEMPTS - 1) await wait(coverRetryDelay());
  }
}

interface FetchedPage {
  html: string;
  finalUrl: string;
}

/** 只跟随 http/https，最多 3 次，不带 cookie。读到 2MB 就停。 */
export async function fetchPage(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FetchedPage | null> {
  let current = url;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    let parsed: URL;
    try {
      parsed = new URL(current);
    } catch {
      return null;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

    const response = await fetchImpl(current, {
      signal: AbortSignal.timeout(SNAPSHOT_TIMEOUT_MS),
      redirect: "manual",
      headers: { "user-agent": "nav-snapshot" },
      cache: "no-store",
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return null;
      current = new URL(location, current).toString();
      continue;
    }

    if (!response.ok) return null;

    const reader = response.body?.getReader();
    if (!reader) {
      const text = await response.text();
      return { html: text.slice(0, SNAPSHOT_MAX_BYTES), finalUrl: current };
    }

    const chunks: Buffer[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      chunks.push(Buffer.from(value));
      if (received >= SNAPSHOT_MAX_BYTES) {
        await reader.cancel();
        break;
      }
    }

    return {
      html: Buffer.concat(chunks).subarray(0, SNAPSHOT_MAX_BYTES).toString("utf8"),
      finalUrl: current,
    };
  }

  return null;
}

/** 抓正文。不足 400 字就不写文件。 */
export async function captureSnapshot(
  id: number,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const bookmark = getBookmark(id);
  if (!bookmark) return;

  const page = await fetchPage(bookmark.url, fetchImpl);
  if (!page) return;

  const paragraphs = extractParagraphs(page.html);
  if (!paragraphs) return;

  const today = new Date();
  const capturedOn = `${today.getUTCFullYear()}.${String(today.getUTCMonth() + 1).padStart(2, "0")}.${String(today.getUTCDate()).padStart(2, "0")}`;

  writeSnapshot(
    id,
    renderSnapshot({
      title: bookmark.title,
      url: page.finalUrl,
      capturedOn,
      paragraphs,
    }),
  );
}

/** 收录后只抓封面。快照要等人点了「取快照」才抓。 */
export function scheduleCapture(id: number): void {
  if (inFlight.has(id) || hasCover(id)) return;

  inFlight.add(id);
  void (async () => {
    try {
      await captureCover(id);
    } catch {
      // 封面失败就留着「显影中」
    } finally {
      inFlight.delete(id);
    }
  })();
}

/** 按需抓正文。已有快照就不重抓。 */
export function scheduleSnapshot(id: number): void {
  if (inFlight.has(id) || hasSnapshot(id)) return;

  inFlight.add(id);
  void (async () => {
    try {
      await captureSnapshot(id);
    } catch {
      // 抓不到就不写文件
    } finally {
      inFlight.delete(id);
    }
  })();
}

export function discardArchive(id: number): void {
  inFlight.delete(id);
  removeArchive(id);
}
