import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import RoadmapExplorer from "../src/ui/RoadmapExplorer";
import { masterRoadmap } from "../src/content/roadmap";
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

  // Sync with URL location if query param or path changes
  useEffect(() => {
    const syncFromLocation = () => {
      const path = window.location.pathname;
      if (path.startsWith("/roadmap/")) {
        const seg = path.replace("/roadmap/", "").replace(/\/$/, "");
        if (seg) {
          setSelectedSlug(seg);
          return;
        }
      }
      if (path === "/roadmap") {
        setSelectedSlug(masterRoadmap.id);
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const track = params.get("track");
      if (track) {
        setSelectedSlug(track);
      } else if (path === "/") {
        setSelectedSlug(masterRoadmap.id);
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

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
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
