export interface EngineeringPhase {
  id: string;
  phaseNumber: number;
  title: string;
  summary: string;
  gateTitle: string;
  disciplineIds: string[];
}

export const MASTER_ENGINEERING_PHASES: EngineeringPhase[] = [
  {
    id: "phase-1",
    phaseNumber: 1,
    title: "PHASE 01: SCIENTIFIC & PHYSICAL FOUNDATIONS",
    summary:
      "Establish cellular biophysics, neuromorphic execution hardware, and spatial engine dynamics.",
    gateTitle: "Gate 01: Biological & Physical Transduction Validated",
    disciplineIds: ["neuroscience", "hardware-architecture", "virtual-environments"],
  },
  {
    id: "phase-2",
    phaseNumber: 2,
    title: "PHASE 02: INTERFACES & NEURAL INTERACTION",
    summary:
      "Build bi-directional neural recording decoders, kinesthetic/tactile haptic feedback, and non-invasive cortical stimulation.",
    gateTitle: "Gate 02: Bi-Directional Closed-Loop Neural IO Synchronized",
    disciplineIds: ["bci", "haptics", "neural-modulation", "sensory-substitution"],
  },
  {
    id: "phase-3",
    phaseNumber: 3,
    title: "PHASE 03: SYSTEMS, SOFTWARE & SAFETY",
    summary:
      "Hard real-time microkernels (<1ms jitter), cross-modal sensor synchronization, cognitive privacy encryption, and hardware watchdogs.",
    gateTitle: "Gate 03: Deterministic Runtime & Fail-Safe Watchdogs Verified",
    disciplineIds: ["software-frameworks", "system-integration", "ethical-engineering"],
  },
  {
    id: "phase-4",
    phaseNumber: 4,
    title: "PHASE 04: FRONTIER RESEARCH & SYNTHESIS",
    summary:
      "Whole-brain connectome simulation graphs, optogenetic molecular interfaces, and end-to-end full-dive architectural synthesis.",
    gateTitle: "Gate 04: Full-Dive Synthetic Architecture Proven",
    disciplineIds: ["advanced-neural-mapping", "future-frontiers"],
  },
];
