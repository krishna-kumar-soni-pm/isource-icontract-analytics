"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ExternalLink, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const COOLDOWN_MS = 3 * 60 * 60 * 1000; // 3 hours

function ago(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function SyncStatus({ lastSyncedAt }: { lastSyncedAt: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const sinceMs = lastSyncedAt ? now - new Date(lastSyncedAt).getTime() : Infinity;
  const cooling = sinceMs < COOLDOWN_MS;
  const cooldownLeftH = cooling ? Math.ceil((COOLDOWN_MS - sinceMs) / 3_600_000) : 0;

  const bookmarklet = origin
    ? `javascript:(function(){fetch('${origin}/api/agent').then(function(r){return r.text()}).then(function(t){(0,eval)(t)}).catch(function(e){alert('Sync loader failed: '+e)})})()`
    : "#";

  return (
    <div className="flex items-center gap-2.5">
      <div className="hidden text-right sm:block">
        <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
          <Check className={cn("size-3.5", lastSyncedAt ? "text-success" : "text-muted-foreground/50")} />
          Last synced
        </div>
        <div className="text-sm font-medium">{ago(lastSyncedAt)}</div>
      </div>

      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            disabled={cooling}
            title={cooling ? `Synced recently · available in ~${cooldownLeftH}h` : "Refresh from Userpilot"}
          >
            {cooling ? (
              <Clock data-icon="inline-start" />
            ) : (
              <RefreshCw data-icon="inline-start" />
            )}
            {cooling ? `Available in ~${cooldownLeftH}h` : "Refresh data"}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Refresh from Userpilot</DialogTitle>
            <DialogDescription>
              Data is pulled inside your logged-in Userpilot session (your token never leaves the
              browser). One-time setup, then it&apos;s one click.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 text-sm">
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary">1</Badge>
                <span className="font-medium">Drag this to your bookmarks bar (once)</span>
              </div>
              <a
                href={bookmarklet}
                onClick={(e) => e.preventDefault()}
                className="inline-flex w-fit cursor-grab items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-sm font-medium shadow-xs active:cursor-grabbing"
                draggable
              >
                <RefreshCw className="size-3.5 text-primary" />
                Sync Userpilot → Dashboard
              </a>
              <p className="text-xs text-muted-foreground">
                Drag the button above onto your browser&apos;s bookmarks bar.
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary">2</Badge>
                <span className="font-medium">Open Userpilot &amp; click the bookmark</span>
              </div>
              <Button asChild variant="secondary" size="sm" className="w-fit">
                <a href="https://run.userpilot.io" target="_blank" rel="noopener noreferrer">
                  <ExternalLink data-icon="inline-start" />
                  Open Userpilot
                </a>
              </Button>
              <p className="text-xs text-muted-foreground">
                On the Userpilot tab, click the <strong>Sync</strong> bookmark. A panel shows
                progress; when it says “Synced”, reload this dashboard.
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              The last 3 synced versions are retained; older ones are pruned automatically.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
