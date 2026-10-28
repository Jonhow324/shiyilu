/**
 * read token 的浏览器存储。token 只存在 localStorage 里，服务端不保存。
 *
 * 之所以做成「外部 store + useSyncExternalStore」，而不是在 useEffect 里读一次再 setState：
 * React 19 的 react-hooks/set-state-in-effect 规则禁止「用 effect 把外部数据源同步进本地 state」，
 * 而 localStorage 正是典型的 React 之外的可变数据源，官方推荐用 useSyncExternalStore 订阅。
 */

const STORAGE_KEY = "nav.token";

let cached: string | null = null;
let loaded = false;
const listeners = new Set<() => void>();

/** 订阅 token 变化（供 useSyncExternalStore 使用） */
export function subscribeToken(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 客户端快照：首次调用时惰性读取 localStorage 并缓存，之后返回同一份引用 */
export function getTokenSnapshot(): string | null {
  if (!loaded && typeof window !== "undefined") {
    loaded = true;
    cached = window.localStorage.getItem(STORAGE_KEY);
  }
  return cached;
}

/** SSR 与水合阶段的快照：服务端读不到 localStorage，一律当作「未设置」 */
export function getServerTokenSnapshot(): string | null {
  return null;
}

export function saveToken(token: string): void {
  cached = token;
  loaded = true;
  window.localStorage.setItem(STORAGE_KEY, token);
  for (const listener of listeners) listener();
}

export function clearToken(): void {
  cached = null;
  loaded = true;
  window.localStorage.removeItem(STORAGE_KEY);
  for (const listener of listeners) listener();
}
