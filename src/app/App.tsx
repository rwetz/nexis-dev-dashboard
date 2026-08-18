import { DevDashLogo } from "@/components/AppLogo";
import { ResizeHandles } from "@/components/ResizeHandles";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WindowControls } from "@/components/WindowControls";
import { IS_MAC } from "@/lib/platform";
import { cn } from "@/lib/utils";
import { openConfig, openInTerminal, openPath } from "@/modules/repos/api";
import { DetailPanel } from "@/modules/repos/DetailPanel";
import { RepoTable } from "@/modules/repos/RepoTable";
import { StatusBar } from "@/modules/repos/StatusBar";
import { useReposStore } from "@/modules/repos/store";
import { ThemeProvider, useTheme } from "@/modules/theme/ThemeProvider";
import { BUILTIN_THEMES } from "@/modules/theme/themes";
import {
  Moon02Icon,
  RefreshIcon,
  Sun01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { MotionConfig } from "motion/react";
import { useEffect } from "react";
import { toast } from "sonner";

export default function App() {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.2 }}>
        <TooltipProvider>
          <Shell />
          <Toaster />
        </TooltipProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}

function Shell() {
  const refresh = useReposStore((s) => s.refresh);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useKeyboardBindings();

  return (
    <div className="flex h-full flex-col">
      <Header />
      <main className="zoom-content flex min-h-0 flex-1">
        <Content />
        <DetailPanel />
      </main>
      <StatusBar />
      <ResizeHandles />
    </div>
  );
}

function Header() {
  const scanning = useReposStore((s) => s.scanning);
  const refresh = useReposStore((s) => s.refresh);

  return (
    <header
      data-tauri-drag-region
      className={cn(
        "flex h-10 shrink-0 items-center gap-2 border-b border-border/60 bg-card select-none",
        IS_MAC ? "pl-20" : "pl-3",
      )}
    >
      <DevDashLogo className="pointer-events-none size-6" />
      <span className="pointer-events-none font-heading text-sm font-semibold">
        Dev Dashboard
      </span>
      <div data-tauri-drag-region className="h-full flex-1" />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Refresh (r)"
        title="Refresh (r)"
        disabled={scanning}
        onClick={() => void refresh()}
      >
        <HugeiconsIcon
          icon={RefreshIcon}
          size={15}
          strokeWidth={2}
          className={scanning ? "animate-spin" : undefined}
        />
      </Button>
      <ThemeMenu />
      <WindowControls />
    </header>
  );
}

function ThemeMenu() {
  const { mode, resolvedMode, themeId, setMode, setThemeId } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Theme">
          <HugeiconsIcon
            icon={resolvedMode === "dark" ? Moon02Icon : Sun01Icon}
            size={15}
            strokeWidth={2}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Mode</DropdownMenuLabel>
        {(["light", "dark", "system"] as const).map((m) => (
          <DropdownMenuCheckboxItem
            key={m}
            checked={mode === m}
            onCheckedChange={() => setMode(m)}
            className="capitalize"
          >
            {m}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        {BUILTIN_THEMES.map((t) => (
          <DropdownMenuCheckboxItem
            key={t.id}
            checked={themeId === t.id}
            onCheckedChange={() => setThemeId(t.id)}
          >
            {t.name}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Content() {
  const repos = useReposStore((s) => s.repos);
  const scanning = useReposStore((s) => s.scanning);
  const elapsedMs = useReposStore((s) => s.elapsedMs);
  const scanError = useReposStore((s) => s.scanError);
  const configPath = useReposStore((s) => s.configPath);
  const scanRoot = useReposStore((s) => s.scanRoot);

  if (repos.length > 0) return <RepoTable />;

  return (
    <div className="flex min-w-0 flex-1 items-center justify-center p-8">
      <div
        className={cn(
          "max-w-md rounded-2xl border border-border/60 bg-card p-6 text-center",
          scanning && "aurora-border",
        )}
      >
        {scanning && elapsedMs === null ? (
          <p className="text-sm text-muted-foreground">Scanning repositories…</p>
        ) : scanError ? (
          <>
            <p className="text-sm font-medium text-destructive">Scan failed</p>
            <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
              {scanError}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium">No git repos found</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {scanRoot
                ? `Nothing under ${scanRoot}. Add explicit paths or point scan_root somewhere else in your config.`
                : "Add repo paths or a scan_root to your config."}
            </p>
            {configPath && (
              <p className="mt-1 break-all font-mono text-xs text-muted-foreground/60">
                {configPath}
              </p>
            )}
          </>
        )}
        {!scanning && (
          <Button
            size="sm"
            variant="outline"
            className="mt-4"
            onClick={() =>
              void openConfig().catch((e) =>
                toast.error("Could not open config", { description: String(e) }),
              )
            }
          >
            Open config.toml
          </Button>
        )}
      </div>
    </div>
  );
}

function useKeyboardBindings() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      )
        return;

      const s = useReposStore.getState();
      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          s.moveSelection(1);
          break;
        case "k":
        case "ArrowUp":
          e.preventDefault();
          s.moveSelection(-1);
          break;
        case "Enter":
          e.preventDefault();
          void s.toggleDetail();
          break;
        case "Escape":
          s.closeDetail();
          break;
        case "r":
          void s.refresh();
          break;
        case "t":
          if (s.selectedPath) {
            const path = s.selectedPath;
            openInTerminal(path)
              .then((term) => toast.success(`Opened ${term}`))
              .catch((err) =>
                toast.error("Could not open terminal", { description: String(err) }),
              );
          }
          break;
        case "o":
          if (s.selectedPath) {
            openPath(s.selectedPath).catch((err) =>
              toast.error("Could not open folder", { description: String(err) }),
            );
          }
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
