import Link from "next/link";
import { markUpdatesSeenAction } from "@/lib/actions/notifications";
import { formatDate } from "@/lib/labels";

type Update = { id: string; title: string; body: string; link: string; createdAt: Date };

/**
 * What the client's reviewer did (classification confirmed or set, document
 * released), newest first. Items since the member last marked them as read
 * are highlighted; the rest stay listed for reference.
 */
export function UpdatesPanel({ updates, seenAt, back }: { updates: Update[]; seenAt: Date | null; back: string }) {
  if (!updates.length) return null;
  const isNew = (u: Update) => !seenAt || u.createdAt > seenAt;
  const fresh = updates.filter(isNew).length;
  return (
    <section className="rounded-2xl border border-hairline bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-3.5">
        <div>
          <p className="font-mono text-[11px] font-medium tracking-micro-wide text-gold">UPDATES FROM YOUR REVIEWER</p>
          <h2 className="font-display text-[17px] font-semibold text-ink">
            {fresh ? `${fresh} new update${fresh === 1 ? "" : "s"}` : "No new updates"}
          </h2>
        </div>
        {fresh > 0 && (
          <form action={markUpdatesSeenAction.bind(null, back)}>
            <button className="rounded-lg border border-hairline px-3 py-1.5 text-[12px] font-semibold text-ink hover:border-gold">
              Mark all as read
            </button>
          </form>
        )}
      </div>
      <ul className="divide-y divide-hairline-light">
        {updates.slice(0, 8).map((u) => (
          <li key={u.id}>
            <Link href={u.link} className={`flex gap-3 px-5 py-3 hover:bg-row-hover ${isNew(u) ? "" : "opacity-70"}`}>
              <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${isNew(u) ? "bg-gold" : "bg-hairline"}`} />
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold text-ink">
                  {u.title}
                  {isNew(u) && <span className="ml-2 rounded-full bg-gold-tint px-2 py-0.5 align-middle font-mono text-[10px] text-gold-deep">NEW</span>}
                </span>
                <span className="block text-[12.5px] leading-relaxed text-muted">{u.body}</span>
              </span>
              <span className="shrink-0 text-[12px] text-label">{formatDate(u.createdAt)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
