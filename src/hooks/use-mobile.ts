import * as React from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

/*
 * shadcn 生成的原版在 effect 里同步 setState，会触发 React 19 的
 * react-hooks/set-state-in-effect。媒体查询同样是 React 之外的可变数据源，
 * 这里改用 useSyncExternalStore 订阅。
 */
function subscribe(onStoreChange: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener("change", onStoreChange)
  return () => mql.removeEventListener("change", onStoreChange)
}

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

/** SSR 阶段没有窗口，按「非移动端」渲染，水合后由客户端快照纠正 */
function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
