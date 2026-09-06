export type RoadmapStorage = {
  getState: () => Promise<Record<string, unknown> | null>;
  setState: (key: string, value: unknown) => Promise<{ ok: boolean; error?: string }>;
};

export type RoadmapExplorerProps = {
  slug: string;
  isSignedIn?: boolean;
  storage?: RoadmapStorage;
};
