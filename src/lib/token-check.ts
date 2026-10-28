/**
 * 解锁前先探一下钥匙对不对。
 *
 * 不去新建书签，也不加验证接口：拿当前 token 去改一个几乎不可能存在的编号。
 * 鉴权在读取数据之前，所以
 * - 401：钥匙不对；
 * - 404：钥匙对，只是这个 id 没有书签；
 * - 其它：说不准（网络断了、服务端 500），不让解锁但也不清除已存在的钥匙。
 */
const PROBE_ID = 999999999;

export type TokenCheck = "ok" | "invalid" | "unknown";

export async function verifyToken(
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TokenCheck> {
  try {
    const response = await fetchImpl(`/api/bookmarks/${PROBE_ID}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      // 空 body 会被参数校验挡成 400，先给一个合法但无意义的局部更新，
      // 这样鉴权通过后才会走到「书签不存在」的 404。
      body: JSON.stringify({ description: "" }),
    });

    if (response.status === 401) return "invalid";
    if (response.status === 404) return "ok";
    return "unknown";
  } catch {
    return "unknown";
  }
}
