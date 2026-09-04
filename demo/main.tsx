import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import RoadmapExplorer from "../src/ui/RoadmapExplorer";
import { masterRoadmap, roadmapFields } from "../src/content/roadmap";
import "./demo.css";

function DemoHarness() {
  const [signedIn, setSignedIn] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState(masterRoadmap.id);
  const [mockServerStore, setMockServerStore] = useState<Record<string, unknown>>(() => {
    try {
      const saved = localStorage.getItem("ofd-demo-mock-server-store");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [showStorageDebug, setShowStorageDebug] = useState(false);

  // Sync with URL location if query param or path changes
  useEffect(() => {
    const syncFromLocation = () => {
      const params = new URLSearchParams(window.location.search);
      const track = params.get("track");
      if (track) {
        setSelectedSlug(track);
      }
    };
    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);
    return () => window.removeEventListener("popstate", syncFromLocation);
  }, []);

  // Save mock store changes to demo localStorage
  useEffect(() => {
    localStorage.setItem("ofd-demo-mock-server-store", JSON.stringify(mockServerStore));
  }, [mockServerStore]);

  // The mock storage bridge passed to the plugin when signed in
  const mockStorage = {
    async getState() {
      return mockServerStore;
    },
    async setState(key: string, value: unknown) {
      setMockServerStore((prev) => ({ ...prev, [key]: value }));
      console.log(`[Storage Bridge Set] ${key}:`, value);
      return { ok: true };
    },
  };

  const handleSlugChange = (slug: string) => {
    setSelectedSlug(slug);
    const newUrl = slug === masterRoadmap.id ? "/" : `/?track=${slug}`;
    window.history.pushState({}, "", newUrl);
  };

  const handleClearStorage = () => {
    setMockServerStore({});
    localStorage.removeItem("ofd-demo-mock-server-store");
    localStorage.removeItem("ofd-roadmap-status-v1");
    localStorage.removeItem("ofd-roadmap-favorites-v1");
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Standalone Test Controls Bar */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)] px-6 py-3 shadow-md">
        <div className="mx-auto flex max-w-[1380px] flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded bg-[var(--accent)] px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
              Roadmap Plugin Test Harness
            </span>
            <span className="text-xs text-[var(--dim)]">Standalone Vite Preview (Zero Backend)</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            {/* Track Selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="track-select" className="text-xs font-medium text-[var(--dim)]">
                Track:
              </label>
              <select
                id="track-select"
                value={selectedSlug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs font-medium text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
              >
                <option value={masterRoadmap.id}>Overview (All Roadmaps)</option>
                {roadmapFields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Auth Toggle */}
            <label className="flex cursor-pointer items-center gap-2 select-none text-xs font-medium">
              <input
                type="checkbox"
                checked={signedIn}
                onChange={(e) => setSignedIn(e.target.checked)}
                className="rounded accent-[var(--accent)]"
              />
              <span>{signedIn ? "Signed In (Server Bridge)" : "Anonymous (LocalStorage)"}</span>
            </label>

            {/* Storage Inspector Toggle */}
            <button
              type="button"
              onClick={() => setShowStorageDebug((v) => !v)}
              className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-[var(--text)]"
            >
              {showStorageDebug ? "Hide Storage" : "Inspect Storage"}
            </button>

            {/* Reset Data */}
            <button
              type="button"
              onClick={handleClearStorage}
              className="rounded border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--danger)] hover:bg-[var(--danger-dim)]"
            >
              Reset Data
            </button>
          </div>
        </div>

        {/* Live Storage Inspector Drawer */}
        {showStorageDebug && (
          <div className="mt-3 border-t border-[var(--border)] pt-3 text-xs">
            <div className="text-[var(--dim)] mb-1 font-semibold">Active Plugin Storage State:</div>
            <pre className="max-h-40 overflow-auto rounded bg-[var(--surface-3)] p-2 font-mono text-[11px] text-[var(--muted)]">
              {JSON.stringify(
                signedIn ? mockServerStore : {
                  "local:progress": JSON.parse(localStorage.getItem("ofd-roadmap-status-v1") || "{}"),
                  "local:favorites": JSON.parse(localStorage.getItem("ofd-roadmap-favorites-v1") || "[]")
                },
                null,
                2
              )}
            </pre>
          </div>
        )}
      </header>

      {/* The Roadmap UI Component */}
      <main className="p-6">
        <RoadmapExplorer
          slug={selectedSlug}
          isSignedIn={signedIn}
          storage={signedIn ? mockStorage : undefined}
        />
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<DemoHarness />);
