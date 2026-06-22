"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, ExternalLink, Check, Clock, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const COOLDOWN_MS = 3 * 60 * 60 * 1000;

interface LiveStatus {
  phase: "idle" | "resolving" | "pulling" | "saving" | "done" | "error";
  done: number;
  total: number;
  label: string;
  at: string;
}

const PHASE_TEXT: Record<LiveStatus["phase"], string> = {
  idle: "Waiting…",
  resolving: "Resolving customers",
  pulling: "Pulling usage",
  saving: "Saving to dashboard",
  done: "Synced",
  error: "Sync failed",
};

function ago(iso: string | null): string {
  if (!iso) return "never";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function SyncStatus({ lastSyncedAt }: { lastSyncedAt: string | null }) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [running, setRunning] = useState(false);
  const [live, setLive] = useState<LiveStatus | null>(null);
  const [completed, setCompleted] = useState(false);
  const [copied, setCopied] = useState(false);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const startRef = useRef<string>("");

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const bookmarklet = origin
    ? `javascript:(function(){fetch('${origin}/api/agent').then(function(r){return r.text()}).then(function(t){(0,eval)(t)}).catch(function(e){alert('Sync loader failed: '+e)})})()`
    : "#";

  // Set the javascript: href imperatively — React strips javascript: URLs from JSX.
  useEffect(() => {
    if (linkRef.current && origin) linkRef.current.setAttribute("href", bookmarklet);
  }, [bookmarklet, origin, open]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // Poll sync status while a refresh is in progress.
  useEffect(() => {
    if (!running) return;
    let alive = true;
    const started = Date.now();
    const tick = async () => {
      try {
        const r = await fetch(`${origin}/api/sync-status`, { cache: "no-store" });
        const j = (await r.json()) as { status: LiveStatus | null; lastSyncedAt: string | null };
        if (!alive) return;
        if (j.status && j.status.at >= startRef.current) setLive(j.status);
        // completion = our run's heartbeat hit "done", OR a brand-new version was
        // stored after we started (compare against click time, not the page's value).
        const newVersion = !!j.lastSyncedAt && j.lastSyncedAt > startRef.current;
        const heartbeatDone =
          !!j.status && j.status.at >= startRef.current && j.status.phase === "done";
        if (newVersion || heartbeatDone) {
          setCompleted(true);
          setRunning(false);
        }
      } catch {
        /* keep polling */
      }
      if (alive && Date.now() - started > 9 * 60 * 1000) setRunning(false); // safety stop
    };
    tick();
    const id = setInterval(tick, 2500);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [running, origin, lastSyncedAt]);

  const sinceMs = lastSyncedAt ? now - new Date(lastSyncedAt).getTime() : Infinity;
  const cooling = sinceMs < COOLDOWN_MS && !running;
  const cooldownLeftH = cooling ? Math.ceil((COOLDOWN_MS - sinceMs) / 3_600_000) : 0;

  const startRefresh = useCallback(() => {
    startRef.current = new Date().toISOString();
    setLive(null);
    setCompleted(false);
    setRunning(true);
    setOpen(true);
    window.open("https://run.userpilot.io", "_blank", "noopener");
  }, []);

  const copyBookmarklet = useCallback(() => {
    navigator.clipboard?.writeText(bookmarklet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [bookmarklet]);

  const pct = live && live.total ? Math.min(100, Math.round((live.done / live.total) * 100)) : 0;

  return (
    <div className="flex items-center gap-2.5">
      <div className="hidden text-right sm:block">
        <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
          <Check className={cn("size-3.5", lastSyncedAt ? "text-success" : "text-muted-foreground/50")} />
          Last synced
        </div>
        <div className="text-sm font-medium">{running ? "syncing…" : ago(lastSyncedAt)}</div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="h-9"
        disabled={cooling}
        onClick={startRefresh}
        title={cooling ? `Synced recently · available in ~${cooldownLeftH}h` : "Refresh from Userpilot"}
      >
        {running ? (
          <Loader2 data-icon="inline-start" className="animate-spin" />
        ) : cooling ? (
          <Clock data-icon="inline-start" />
        ) : (
          <RefreshCw data-icon="inline-start" />
        )}
        {running ? "Syncing…" : cooling ? `Available in ~${cooldownLeftH}h` : "Refresh data"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Refreshing from Userpilot</DialogTitle>
            <DialogDescription>
              The pull runs inside your logged-in Userpilot tab — your token never leaves the
              browser. I opened Userpilot for you in a new tab.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 text-sm">
            {/* Live progress */}
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium">
                  {completed ? (
                    <Check className="size-4 text-success" />
                  ) : (
                    <Loader2 className="size-4 animate-spin text-primary" />
                  )}
                  {completed ? "Sync complete" : PHASE_TEXT[live?.phase ?? "idle"]}
                </span>
                {live && live.total > 0 && !completed && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {live.done}/{live.total}
                  </span>
                )}
              </div>
              <Progress value={completed ? 100 : pct} className="h-2" />
              <p className="mt-2 truncate text-xs text-muted-foreground">
                {completed
                  ? "Dashboard updated."
                  : live?.label || "Waiting for the sync to start in the Userpilot tab…"}
              </p>
              {completed && (
                <Button size="sm" className="mt-3 w-full" onClick={() => window.location.reload()}>
                  Reload dashboard
                </Button>
              )}
            </div>

            {/* One-time bookmarklet setup */}
            <div className="flex flex-col gap-2 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="px-1.5">setup</Badge>
                <span className="text-xs font-medium text-muted-foreground">
                  First time? Add the one-click Sync bookmark
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* href set via ref (React blocks javascript: in JSX) */}
                <a
                  ref={linkRef}
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  draggable
                  className="inline-flex cursor-grab items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-sm font-medium shadow-xs active:cursor-grabbing"
                >
                  <RefreshCw className="size-3.5 text-primary" />
                  Sync Userpilot → Dashboard
                </a>
                <Button variant="ghost" size="sm" onClick={copyBookmarklet}>
                  {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Drag the button to your bookmarks bar (once). Then on the Userpilot tab, click it —
                progress shows above. The last 3 synced versions are kept.
              </p>
              <Button asChild variant="secondary" size="sm" className="w-fit">
                <a href="https://run.userpilot.io" target="_blank" rel="noopener noreferrer">
                  <ExternalLink data-icon="inline-start" />
                  Reopen Userpilot
                </a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
