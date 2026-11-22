"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { GROUPS, MODULES } from "@/lib/modules";
import { Icon, LogoMark } from "@/components/icons";

function useOpenAlertCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const load = () =>
      api
        .listAlerts({ status: "open", limit: 1 })
        .then((r) => setCount(r.meta?.total ?? 0))
        .catch(() => setCount(null));
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, []);
  return count;
}

export function Sidebar() {
  const pathname = usePathname();
  const alertCount = useOpenAlertCount();

  const linkClass = (active: boolean) =>
    `group flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
      active ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-accent-soft/60 hover:text-foreground"
    }`;

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border bg-surface p-3 md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:flex-col md:overflow-y-auto md:border-r md:border-b-0 md:p-4">
      <Link href="/" className="mr-3 flex shrink-0 items-center gap-2.5 px-1 md:mr-0 md:mb-5">
        <LogoMark />
        <span className="hidden leading-tight md:block">
          <span className="block text-base font-semibold tracking-tight">{BRAND.name}</span>
          <span className="block text-xs text-muted">{BRAND.project}</span>
        </span>
      </Link>

      <Link href="/" aria-current={pathname === "/" ? "page" : undefined} className={linkClass(pathname === "/")}>
        <Icon name="overview" />
        Overview
      </Link>

      {GROUPS.map((group) => (
        <div key={group} className="contents md:block">
          <p className="hidden px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted/80 md:block">{group}</p>
          {MODULES.filter((m) => m.group === group).map((m) => {
            const href = `/${m.slug}`;
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={linkClass(active)}>
                <Icon name={m.icon} />
                <span className="flex-1">{m.label}</span>
                {m.slug === "alerts" && alertCount ? (
                  <span className="rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-semibold leading-none text-surface tabular-nums" aria-label={`${alertCount} open alerts`}>
                    {alertCount}
                  </span>
                ) : null}
                {m.mode === "sample" && <span className="hidden text-[10px] uppercase tracking-wide opacity-60 md:inline">sample</span>}
              </Link>
            );
          })}
        </div>
      ))}

      <p className="mt-auto hidden px-3 pt-6 text-xs text-muted md:block">{BRAND.tagline}</p>
    </nav>
  );
}
