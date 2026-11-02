/** 快照入口。文件不存在时不要渲染。压在整行链接之上，点它不去原站。 */
export default function SnapshotLink({ id }: { id: number }) {
  return (
    <a
      href={`/api/snapshot/${id}`}
      target="_blank"
      rel="noreferrer"
      className="relative z-10 shrink-0 font-mono text-[10px] font-normal tracking-[0.16em] text-ink-soft uppercase hover:text-seal"
    >
      快照
    </a>
  );
}
