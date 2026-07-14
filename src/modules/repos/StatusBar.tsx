import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Settings01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import { openConfig } from "./api";
import { useReposStore } from "./store";
import { isDirty } from "./types";

export function StatusBar() {
  const repos = useReposStore((s) => s.repos);
  const elapsedMs = useReposStore((s) => s.elapsedMs);
  const scanning = useReposStore((s) => s.scanning);
  const configPath = useReposStore((s) => s.configPath);

  const dirty = repos.filter(isDirty).length;
  const ahead = repos.filter((r) => r.ahead > 0).length;
  const behind = repos.filter((r) => r.behind > 0).length;
  const errors = repos.filter((r) => r.error).length;

  return (
    <footer className="flex h-7 shrink-0 items-center gap-3 border-t border-border/60 bg-card px-3 text-xs text-muted-foreground select-none">
      <span className="tabular-nums">
        {repos.length} repos
        {dirty > 0 && <> · <span className="text-amber-400">{dirty} dirty</span></>}
        {ahead > 0 && <> · <span className="text-sky-400">{ahead} ahead</span></>}
        {behind > 0 && <> · <span className="text-orange-400">{behind} behind</span></>}
        {errors > 0 && <> · <span className="text-destructive">{errors} errors</span></>}
      </span>
      <span className="tabular-nums text-muted-foreground/60">
        {scanning ? "scanning…" : elapsedMs !== null ? `scanned in ${elapsedMs} ms` : ""}
      </span>

      <span className="flex-1" />

      <span className="hidden text-muted-foreground/60 md:block">
        j/k navigate · ↵ details · r refresh · t terminal · o folder
      </span>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Open config.toml"
            onClick={() =>
              openConfig().catch((e) =>
                toast.error("Could not open config", { description: String(e) }),
              )
            }
          >
            <HugeiconsIcon icon={Settings01Icon} size={13} strokeWidth={2} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {configPath ?? "config.toml"}
        </TooltipContent>
      </Tooltip>
    </footer>
  );
}
