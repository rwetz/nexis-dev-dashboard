import { toast } from "sonner";
import { create } from "zustand";
import { fetchRepoDetail, scanRepos } from "./api";
import type { RepoDetail, RepoStatus } from "./types";

type ReposState = {
  repos: RepoStatus[];
  scanning: boolean;
  /** null until the first scan lands */
  elapsedMs: number | null;
  configPath: string | null;
  scanRoot: string | null;
  scanError: string | null;

  selectedPath: string | null;
  detailOpen: boolean;
  detail: RepoDetail | null;
  detailLoading: boolean;

  refresh: () => Promise<void>;
  select: (path: string) => void;
  moveSelection: (delta: number) => void;
  openDetail: () => Promise<void>;
  closeDetail: () => void;
  toggleDetail: () => Promise<void>;
};

export const useReposStore = create<ReposState>((set, get) => ({
  repos: [],
  scanning: false,
  elapsedMs: null,
  configPath: null,
  scanRoot: null,
  scanError: null,

  selectedPath: null,
  detailOpen: false,
  detail: null,
  detailLoading: false,

  refresh: async () => {
    if (get().scanning) return;
    set({ scanning: true });
    try {
      const result = await scanRepos();
      set((s) => {
        const stillThere = result.repos.some((r) => r.path === s.selectedPath);
        return {
          repos: result.repos,
          elapsedMs: result.elapsed_ms,
          configPath: result.config_path,
          scanRoot: result.scan_root,
          scanError: null,
          selectedPath: stillThere
            ? s.selectedPath
            : (result.repos[0]?.path ?? null),
          detailOpen: s.detailOpen && stillThere,
          detail: stillThere ? s.detail : null,
        };
      });
      // Keep an open detail pane in sync with the fresh scan.
      const { detailOpen } = get();
      if (detailOpen) await get().openDetail();
    } catch (e) {
      const message = String(e);
      set({ scanError: message });
      toast.error("Scan failed", { description: message });
    } finally {
      set({ scanning: false });
    }
  },

  select: (path) => {
    if (path === get().selectedPath) return;
    set({ selectedPath: path });
    if (get().detailOpen) void get().openDetail();
  },

  moveSelection: (delta) => {
    const { repos, selectedPath } = get();
    if (repos.length === 0) return;
    const idx = repos.findIndex((r) => r.path === selectedPath);
    const next = idx === -1 ? 0 : Math.min(repos.length - 1, Math.max(0, idx + delta));
    get().select(repos[next].path);
  },

  openDetail: async () => {
    const { selectedPath } = get();
    if (!selectedPath) return;
    set({ detailOpen: true, detailLoading: true });
    try {
      const detail = await fetchRepoDetail(selectedPath);
      // Selection may have moved while we were fetching.
      if (get().selectedPath === selectedPath) set({ detail });
    } catch (e) {
      toast.error("Could not load repo detail", { description: String(e) });
      set({ detailOpen: false, detail: null });
    } finally {
      set({ detailLoading: false });
    }
  },

  closeDetail: () => set({ detailOpen: false, detail: null }),

  toggleDetail: async () => {
    if (get().detailOpen) get().closeDetail();
    else await get().openDetail();
  },
}));
