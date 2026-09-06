import {
  roadmapFieldById,
  roadmapFields,
  type RoadmapField,
  type RoadmapSection,
  type TopicStatus,
} from "../../../content/roadmap";
import type { FlowchartData, NodeItem, EdgeItem, SectionBoxItem } from "../../types/flowchart";
import { topicKey } from "../../utils/storage";

const CANVAS_WIDTH = 1000;
const CENTER_X = 500;

function getFirstSection(f: RoadmapField): RoadmapSection {
  return (
    f.sections[0] ?? {
      id: `${f.id}-default`,
      title: f.title,
      summary: f.description,
      topics: [f.title],
      project: `${f.title} Project`,
    }
  );
}

const createSecBox = (id: string, title: string, boxY: number, boxH: number, labelY: number): SectionBoxItem => ({
  id,
  title,
  boxX: 20,
  boxY,
  boxW: 960,
  boxH,
  labelX: 45,
  labelY,
});

const createGate = (
  id: string,
  label: string,
  field: RoadmapField,
  x: number,
  y: number,
  width: number,
): NodeItem => ({
  id,
  type: "gate",
  topicName: label,
  section: getFirstSection(field),
  field,
  label,
  x,
  y,
  width,
  height: 38,
});

const createHub = (
  id: string,
  label: string,
  topic: string,
  field: RoadmapField,
  x: number,
  y: number,
  width: number,
): NodeItem => ({
  id,
  type: "milestone-sub",
  topicName: topic,
  section: getFirstSection(field),
  field,
  label,
  x,
  y,
  width,
  height: 40,
  badge: "recommended",
});

export function generateMasterTopology(
  _fields?: RoadmapField[],
  statuses: Record<string, TopicStatus> = {},
): FlowchartData {
  const nodes: NodeItem[] = [];
  const edges: EdgeItem[] = [];
  const sectionBoxes: SectionBoxItem[] = [];

  const legendCard = { x: 15, y: 20, width: 260, height: 120 };
  const curriculumCard = { x: 725, y: 20, width: 260, height: 120 };

  // Top Spine Guide & Start Title
  edges.push({ id: "master-top-spine-guide", type: "branch", path: `M ${CENTER_X} 20 V 160` });
  const trackTitleNode = {
    id: "master-start-title",
    label: "★ START: FULL-DIVE VR CURRICULUM",
    x: CENTER_X - 175,
    y: 160,
    width: 350,
    height: 44,
  };

  const addDisciplineCluster = (
    field: RoadmapField,
    colX: number,
    pillX: number,
    centerX: number,
    nodeY: number,
    nodeW: number,
    nodeH: number,
    pillW: number,
    pillH: number,
    pillStartY: number,
    pillStepY: number,
    badge: "recommended" | "alternative",
    topics: string[],
    phasePrefix: string,
  ) => {
    const sec = getFirstSection(field);
    const t0 = topics[0] ?? field.title;
    nodes.push({
      id: `disc-${field.id}`,
      type: "discipline",
      topicName: t0,
      section: sec,
      field,
      label: field.title,
      x: colX,
      y: nodeY,
      width: nodeW,
      height: nodeH,
      status: statuses[topicKey(field, t0)],
      badge,
      href: `/roadmap/${field.id}`,
      group: `fld-${field.id}`,
    });

    topics.forEach((t, tidx) => {
      const pillY = pillStartY + tidx * pillStepY;
      edges.push({
        id: `${phasePrefix}-${field.id}-pill-edge-${tidx}`,
        type: "branch",
        path: `M ${centerX} ${tidx === 0 ? nodeY + nodeH : pillY - 8} V ${pillY}`,
        group: `fld-${field.id}`,
      });
      nodes.push({
        id: `${phasePrefix}-${field.id}-pill-${tidx}`,
        type: "concept-pill",
        topicName: t,
        section: sec,
        field,
        label: t,
        x: pillX,
        y: pillY,
        width: pillW,
        height: pillH,
        badge: tidx === 0 ? "recommended" : "alternative",
        status: statuses[topicKey(field, t)],
        group: `fld-${field.id}`,
      });
    });
  };

  // PHASE 01: Scientific & Physical Foundations
  sectionBoxes.push(createSecBox("sec-box-phase-1", "PHASE 01: SCIENTIFIC & PHYSICAL FOUNDATIONS", 235, 345, 225));
  edges.push({ id: "spine-to-p1-hub", type: "spine", path: `M ${CENTER_X} 204 V 240` });

  const neuroField = roadmapFieldById("neuroscience") ?? roadmapFields[0]!;
  const hwField = roadmapFieldById("hardware-architecture") ?? roadmapFields[1]!;
  const veField = roadmapFieldById("virtual-environments") ?? roadmapFields[2]!;

  nodes.push(createHub("p1-hub", "Sensory & Physical Substrates", neuroField.sections[0]?.topics[0] ?? "Sensory Transduction", neuroField, CENTER_X - 150, 240, 300));

  const p1Discs = [
    { field: neuroField, colX: 40, pillX: 50, centerX: 180, topics: ["Sensory Perception & Transduction", "Neural Population Coding", "Cortical Map Topography"] },
    { field: hwField, colX: 360, pillX: 370, centerX: 500, topics: ["Neuromorphic Processing ASICs", "Sub-Millisecond Neural Bus", "Thermal Dissipation (<1°C rise)"] },
    { field: veField, colX: 680, pillX: 690, centerX: 820, topics: ["Spatial Engine Latency (<5ms)", "Perceptual Alignment & VOR", "Dynamic Lighting & Occlusion"] },
  ];
  p1Discs.forEach((d) => {
    edges.push({
      id: `p1-hub-to-${d.field.id}`,
      type: d.centerX === 500 ? "spine" : "branch",
      path: d.centerX === 500 ? "M 500 280 V 325" : `M 500 280 C 500 305, ${d.centerX} 300, ${d.centerX} 325`,
      group: `fld-${d.field.id}`,
    });
    addDisciplineCluster(d.field, d.colX, d.pillX, d.centerX, 325, 280, 48, 260, 32, 388, 40, d.field.level === "Foundation" ? "recommended" : "alternative", d.topics, "p1");
  });

  edges.push(
    { id: "p1-converge-left", type: "branch", path: "M 180 500 C 180 520, 500 515, 500 535" },
    { id: "p1-converge-center", type: "spine", path: "M 500 500 V 535" },
    { id: "p1-converge-right", type: "branch", path: "M 820 500 C 820 520, 500 515, 500 535" },
  );
  nodes.push(createGate("gate-01", "Gate 01: Biological & Physical Transduction Validated", neuroField, 230, 535, 540));

  // PHASE 02: Interfaces & Neural Interaction
  sectionBoxes.push(createSecBox("sec-box-phase-2", "PHASE 02: INTERFACES & NEURAL INTERACTION", 605, 450, 595));
  edges.push({ id: "gate-1-to-p2-hub", type: "spine", path: `M ${CENTER_X} 573 V 610` });

  const bciField = roadmapFieldById("bci") ?? roadmapFields[0]!;
  const hapticsField = roadmapFieldById("haptics") ?? roadmapFields[1]!;
  const nmField = roadmapFieldById("neural-modulation") ?? roadmapFields[2]!;
  const ssField = roadmapFieldById("sensory-substitution") ?? roadmapFields[3]!;

  nodes.push(createHub("p2-hub", "Closed-Loop Neural IO & Transduction", bciField.sections[0]?.topics[0] ?? "Neural Signal Acquisition", bciField, CENTER_X - 170, 610, 340));

  edges.push(
    { id: "p2-to-bci", type: "branch", path: "M 500 650 C 500 668, 260 662, 260 680" },
    { id: "p2-to-haptics", type: "branch", path: "M 500 650 C 500 668, 740 662, 740 680" },
    { id: "p2-spine-mid", type: "spine", path: "M 500 650 V 845" },
    { id: "p2-to-nm", type: "branch", path: "M 500 845 C 500 852, 260 848, 260 855" },
    { id: "p2-to-ss", type: "branch", path: "M 500 845 C 500 852, 740 848, 740 855" },
  );

  const p2Discs = [
    { field: bciField, colX: 80, pillX: 90, centerX: 260, nodeY: 680, topics: ["Noninvasive EEG & ECoG Arrays", "Real-Time Motor Decoder Pipeline"] },
    { field: hapticsField, colX: 560, pillX: 570, centerX: 740, nodeY: 680, topics: ["Kinesthetic Resistance Actuators", "Electrotactile Stimulation Grids"] },
    { field: nmField, colX: 80, pillX: 90, centerX: 260, nodeY: 855, topics: ["Targeted TMS & Microstimulation", "Charge Density (<30µC/cm²) Watchdogs"] },
    { field: ssField, colX: 560, pillX: 570, centerX: 740, nodeY: 855, topics: ["Auditory-to-Tactile Spatial Mapping", "Cross-Modal Cortical Plasticity"] },
  ];
  p2Discs.forEach((d) => {
    addDisciplineCluster(d.field, d.colX, d.pillX, d.centerX, d.nodeY, 360, 44, 340, 30, d.nodeY + 54, 38, d.field.level === "Intermediate" ? "alternative" : "recommended", d.topics, "p2");
  });

  edges.push(
    { id: "p2-converge-left", type: "branch", path: "M 260 977 C 260 1005, 500 995, 500 1025" },
    { id: "p2-converge-right", type: "branch", path: "M 740 977 C 740 1005, 500 995, 500 1025" },
  );
  nodes.push(createGate("gate-02", "Gate 02: Bi-Directional Closed-Loop Neural IO Synchronized", bciField, 210, 1025, 580));

  // PHASE 03: Systems, Software & Safety
  sectionBoxes.push(createSecBox("sec-box-phase-3", "PHASE 03: SYSTEMS, SOFTWARE & SAFETY", 1095, 340, 1085));
  edges.push({ id: "gate-2-to-p3-hub", type: "spine", path: `M ${CENTER_X} 1063 V 1100` });

  const sfField = roadmapFieldById("software-frameworks") ?? roadmapFields[0]!;
  const siField = roadmapFieldById("system-integration") ?? roadmapFields[1]!;
  const eeField = roadmapFieldById("ethical-engineering") ?? roadmapFields[2]!;

  nodes.push(createHub("p3-hub", "Deterministic Runtime & Safety Governance", sfField.sections[0]?.topics[0] ?? "Deterministic Runtime Architecture", sfField, CENTER_X - 160, 1100, 320));

  const p3Discs = [
    { field: sfField, colX: 40, pillX: 50, centerX: 180, topics: ["Deterministic RTOS Microkernel", "Asynchronous Telemetry Stream"] },
    { field: siField, colX: 360, pillX: 370, centerX: 500, topics: ["Sensor Fusion & Synchronization", "Subjective Baseline Calibration"] },
    { field: eeField, colX: 680, pillX: 690, centerX: 820, topics: ["Cognitive Privacy Encryption", "Fail-Safe Hardware Watchdogs"] },
  ];
  p3Discs.forEach((d) => {
    edges.push({
      id: `p3-hub-to-${d.field.id}`,
      type: d.centerX === 500 ? "spine" : "branch",
      path: d.centerX === 500 ? "M 500 1140 V 1180" : `M 500 1140 C 500 1165, ${d.centerX} 1160, ${d.centerX} 1180`,
      group: `fld-${d.field.id}`,
    });
    addDisciplineCluster(d.field, d.colX, d.pillX, d.centerX, 1180, 280, 48, 260, 32, 1243, 40, d.field.level === "Advanced" ? "alternative" : "recommended", d.topics, "p3");
  });

  edges.push(
    { id: "p3-converge-left", type: "branch", path: "M 180 1315 C 180 1340, 500 1335, 500 1360" },
    { id: "p3-converge-center", type: "spine", path: "M 500 1315 V 1360" },
    { id: "p3-converge-right", type: "branch", path: "M 820 1315 C 820 1340, 500 1335, 500 1360" },
  );
  nodes.push(createGate("gate-03", "Gate 03: Deterministic Runtime & Fail-Safe Watchdogs Verified", sfField, 210, 1360, 580));

  // PHASE 04: Frontier Research & Synthesis
  sectionBoxes.push(createSecBox("sec-box-phase-4", "PHASE 04: FRONTIER RESEARCH & SYNTHESIS", 1435, 295, 1425));
  edges.push({ id: "gate-3-to-p4-hub", type: "spine", path: `M ${CENTER_X} 1398 V 1440` });

  const anmField = roadmapFieldById("advanced-neural-mapping") ?? roadmapFields[0]!;
  const ffField = roadmapFieldById("future-frontiers") ?? roadmapFields[1]!;

  nodes.push(createHub("p4-hub", "Frontier Explorations & Nano-Bio Interfacing", anmField.sections[0]?.topics[0] ?? "Nanoscale Neural Mapping", anmField, CENTER_X - 160, 1440, 320));

  const p4Discs = [
    { field: anmField, colX: 120, pillX: 130, centerX: 290, topics: ["Whole-Brain Connectome Graphs", "Synaptic Plasticity & Memory Traces"] },
    { field: ffField, colX: 540, pillX: 550, centerX: 710, topics: ["Optogenetics & Nanoparticle Interfaces", "Direct Cortical Synthesis Boundaries"] },
  ];
  p4Discs.forEach((d) => {
    edges.push({
      id: `p4-hub-to-${d.field.id}`,
      type: "branch",
      path: `M 500 1480 C 500 1505, ${d.centerX} 1500, ${d.centerX} 1520`,
      group: `fld-${d.field.id}`,
    });
    addDisciplineCluster(d.field, d.colX, d.pillX, d.centerX, 1520, 340, 48, 320, 32, 1583, 40, "alternative", d.topics, "p4");
  });

  edges.push(
    { id: "p4-converge-left", type: "branch", path: "M 290 1655 C 290 1680, 500 1675, 500 1695" },
    { id: "p4-converge-right", type: "branch", path: "M 710 1655 C 710 1680, 500 1675, 500 1695" },
  );
  nodes.push(createGate("gate-04", "Gate 04: Full-Dive Synthetic Architecture Proven", anmField, 240, 1695, 520));

  // CAPSTONE FINALE
  edges.push({ id: "gate-4-to-capstone", type: "spine", path: `M ${CENTER_X} 1733 V 1775` });
  nodes.push({
    id: "capstone-master",
    type: "capstone",
    topicName: "Capstone: Full-Dive Architecture Integration & Synthesis",
    section: getFirstSection(neuroField),
    field: neuroField,
    label: "Capstone: Full-Dive Architecture Integration & Synthesis",
    x: 180,
    y: 1775,
    width: 640,
    height: 65,
    badge: "recommended",
  });

  return {
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: 1775 + 65 + 80, // 1920
    legendCard,
    curriculumCard,
    trackTitleNode,
    sectionBoxes,
    nodes,
    edges,
  };
}
