import { slugifyTopic, type RoadmapField, type RoadmapSection, type TopicStatus } from "../../../content/roadmap";
import { getTopicDetails } from "../../../content/topic-details";
import type { FlowchartData, NodeItem, EdgeItem, SectionBoxItem } from "../../types/flowchart";
import { topicKey } from "../../utils/storage";
import {
  getPlatformsForField,
  getPlatformMilestoneTitle,
  getDenoisingMethodsForField,
} from "../../utils/platform-helpers";

const CANVAS_WIDTH = 1000;
const CENTER_X = 500;
const SPINE_W = 220;
const SPINE_X = CENTER_X - SPINE_W / 2; // 390

const createPill = (
  id: string,
  label: string,
  x: number,
  y: number,
  width: number,
  badge: "recommended" | "alternative" | "elective" | undefined,
  section: RoadmapSection,
  topicName: string,
  subtopicName?: string,
  group?: string,
  status?: TopicStatus,
): NodeItem => ({
  id,
  type: "concept-pill",
  label,
  topicName,
  subtopicName,
  section,
  x,
  y,
  width,
  height: 34,
  badge,
  group,
  status,
});

const createProjectCard = (
  id: string,
  level: "Beginner" | "Intermediate" | "Advanced",
  y: number,
  topicName: string,
  section: RoadmapSection,
  note: string,
): NodeItem => ({
  id,
  type: "project-card",
  topicName,
  section,
  label: `${level} Project`,
  x: 15,
  y,
  width: 260,
  height: 95,
  projectNote: note,
  projectBtnText: `${level} Project Ideas`,
  projectLevel: level,
});

const createSub = (
  id: string,
  label: string,
  y: number,
  badge: "recommended" | "alternative",
  section: RoadmapSection,
  topicName: string,
  subtopicName?: string,
  status?: TopicStatus,
): NodeItem => ({
  id,
  type: "milestone-sub",
  label,
  topicName,
  subtopicName,
  section,
  x: SPINE_X,
  y,
  width: SPINE_W,
  height: 38,
  badge,
  status,
});

export function generateDisciplineTopology(
  field: RoadmapField,
  statuses: Record<string, TopicStatus> = {},
): FlowchartData {
  const nodes: NodeItem[] = [];
  const edges: EdgeItem[] = [];
  const sectionBoxes: SectionBoxItem[] = [];

  const legendCard = { x: 15, y: 20, width: 260, height: 120 };
  const curriculumCard = { x: 725, y: 20, width: 260, height: 120 };

  edges.push({ id: "top-spine-guide", type: "branch", path: `M ${CENTER_X} 20 V 175` });
  const trackTitleNode = {
    id: `track-start-${field.id}`,
    label: field.shortTitle,
    x: CENTER_X - 140,
    y: 175,
    width: 280,
    height: 40,
  };
  edges.push({ id: "spine-to-m1", type: "spine", path: `M ${CENTER_X} 215 V 245` });

  const sec1 = field.sections[0] ?? { id: "s1", title: "Foundations", summary: "", topics: [], project: "" };
  const sec2 = field.sections[1] ?? sec1;

  // SECTION 1 (Milestone 1)
  const m1Topic = sec1.topics[0] ?? sec1.title;
  const m1Status = statuses[topicKey(field, m1Topic)];
  nodes.push({
    id: `m1-${sec1.id}`,
    type: "milestone-main",
    topicName: m1Topic,
    section: sec1,
    label: sec1.title,
    x: 380,
    y: 245,
    width: 240,
    height: 44,
    status: m1Status,
    badge: "recommended",
  });

  const m1Subs = [
    { t: sec1.topics[0] ?? "Foundations", y: 310, prevY: 289, b: "recommended" as const },
    { t: sec1.topics[1] ?? "Signal Modality A", y: 366, prevY: 348, b: "recommended" as const },
    { t: sec1.topics[2] ?? "Signal Modality B", y: 422, prevY: 404, b: "alternative" as const },
    { t: sec1.topics[3] ?? "Sensor Montages", y: 478, prevY: 460, b: "alternative" as const },
  ];
  m1Subs.forEach(({ t, y, prevY, b }, idx) => {
    edges.push({
      id: idx === 0 ? "spine-m1-to-sub0" : `spine-sub${idx - 1}-to-sub${idx}`,
      type: "spine",
      path: `M ${CENTER_X} ${prevY} V ${y}`,
      status: idx === 0 ? m1Status : undefined,
    });
    nodes.push(createSub(`sub1-${idx}-${slugifyTopic(t)}`, t, y, b, sec1, t, undefined, statuses[topicKey(field, t)]));
  });

  // Right branch from M1: radiating curves to concept pills
  const rightTopicsM1 = [
    sec1.topics[4] ?? "Electrocorticography arrays",
    sec1.topics[5] ?? "Optical neural interfacing",
    sec1.topics[6] ?? "Neural dust sensors",
    ...getTopicDetails(field.id, m1Subs[0]!.t).subtopics.slice(0, 3),
  ].slice(0, 6);
  rightTopicsM1.forEach((tName, idx) => {
    const cardY = 200 + idx * 42;
    edges.push({
      id: `curve-m1-r-${idx}`,
      group: `m1r-${idx}`,
      type: "radiating",
      path: `M 620 267 C 655 267, 675 ${cardY + 17}, 710 ${cardY + 17}`,
    });
    nodes.push(
      createPill(`concept-m1-r-${idx}`, tName, 710, cardY, 270, idx < 2 ? "recommended" : idx < 4 ? "alternative" : "elective", sec1, tName, undefined, `m1r-${idx}`, statuses[topicKey(field, tName)]),
    );
  });

  // Left branch from M1: Platform grid & Beginner Project
  edges.push({ id: "m1-left-solid", group: "m1left", type: "solid", path: "M 380 267 H 310 V 200 H 275" });
  getPlatformsForField(field.id).forEach((p, idx) => {
    nodes.push(
      createPill(`plat-${idx}-${slugifyTopic(p)}`, p, 15 + (idx % 2) * 135, 200 + Math.floor(idx / 2) * 42, 125, idx < 2 ? "recommended" : idx < 6 ? "alternative" : "elective", sec1, m1Topic, p, "m1left"),
    );
  });
  edges.push({ id: "l-grid-to-pick", type: "solid", path: "M 145 360 V 375" });
  nodes.push({
    id: `pick-plat-${field.id}`,
    type: "milestone-main",
    topicName: m1Topic,
    section: sec1,
    label: getPlatformMilestoneTitle(field.id),
    x: 15,
    y: 375,
    width: 260,
    height: 38,
    badge: "recommended",
  });
  nodes.push(
    createProjectCard("proj-card-beginner", "Beginner", 430, m1Topic, sec1, `Build a small baseline recording and validation pipeline for ${sec1.title} with clear limits.`),
  );

  // --------------------------------------------------------------------------
  // SECTION 2 (Milestone 2)
  // --------------------------------------------------------------------------
  const m2Topic = sec2.topics[0] ?? sec2.title;
  edges.push({ id: "spine-m1-to-m2", type: "spine", path: "M 500 516 V 560" });
  nodes.push({
    id: `m2-${sec2.id}`,
    type: "milestone-main",
    topicName: m2Topic,
    section: sec2,
    label: sec2.title,
    x: 380,
    y: 560,
    width: 240,
    height: 44,
    status: statuses[topicKey(field, m2Topic)],
    badge: "recommended",
  });

  const sec2Subs = [
    { t: sec2.topics[0] ?? "Artifact Removal", y: 624, prevY: 604, b: "recommended" as const },
    { t: sec2.topics[1] ?? "Neural noise filtering", y: 680, prevY: 662, b: "recommended" as const },
    { t: sec2.topics[2] ?? "Feature extraction methods", y: 736, prevY: 718, b: "alternative" as const },
    { t: sec2.topics[3] ?? "Signal amplification circuits", y: 792, prevY: 774, b: "alternative" as const },
  ];
  sec2Subs.forEach(({ t, y, prevY, b }, idx) => {
    edges.push({
      id: idx === 0 ? "spine-m2-to-sub0" : `spine-sub2-${idx - 1}-to-${idx}`,
      type: "spine",
      path: `M ${CENTER_X} ${prevY} V ${y}`,
    });
    nodes.push(createSub(`sub2-${idx}-${slugifyTopic(t)}`, t, y, b, sec2, t, undefined, statuses[topicKey(field, t)]));
  });

  // Left branch from M2: Denoising Grid + Intermediate Project
  edges.push({ id: "m2-left-branch", group: "m2left", type: "radiating", path: "M 380 582 C 345 582, 310 560, 275 560" });
  getDenoisingMethodsForField(field.id).forEach((m, idx) => {
    nodes.push(
      createPill(`denoise-${idx}`, m, 15 + (idx % 2) * 135, 560 + Math.floor(idx / 2) * 42, 125, idx < 2 ? "recommended" : idx < 4 ? "alternative" : "elective", sec2, sec2Subs[0]!.t, m, "m2left"),
    );
  });
  edges.push({ id: "denoise-to-strategy", type: "solid", path: "M 145 678 V 695" });
  nodes.push({
    id: `strategy-milestone-${field.id}`,
    type: "milestone-main",
    topicName: sec2Subs[0]!.t,
    section: sec2,
    label: "Artifact Removal Strategy",
    x: 15,
    y: 695,
    width: 260,
    height: 38,
    badge: "recommended",
  });
  nodes.push(
    createProjectCard("proj-card-intermediate", "Intermediate", 750, sec2Subs[1]!.t, sec2, `Gain hands-on practice by building and testing real-time ${sec2.title} decoders.`),
  );

  // Right branch from M2: Feature Extraction & Decoders
  sectionBoxes.push(
    { id: "sec-box-features", title: "FEATURE EXTRACTION", boxX: 705, boxY: 560, boxW: 280, boxH: 165, labelX: 735, labelY: 550 },
    { id: "sec-box-decoders", title: "REAL-TIME DECODERS & ML", boxX: 705, boxY: 755, boxW: 280, boxH: 215, labelX: 735, labelY: 745 },
  );
  edges.push(
    { id: "m2-to-features-box", group: "feat", type: "radiating", path: "M 620 582 C 655 582, 680 642, 705 642" },
    { id: "m2-to-decoders-box", group: "dec", type: "radiating", path: "M 620 582 C 655 582, 680 860, 705 860" },
  );

  const sec2FeatTopic = sec2.topics[2] ?? sec2.title;
  [
    { l: "Band Power (PSD)", w: 125, x: 715, y: 575, b: "recommended" as const },
    { l: "CSP Filtering", w: 125, x: 850, y: 575, b: "recommended" as const },
    { l: "Time-Frequency Wavelets", w: 125, x: 715, y: 618, b: "alternative" as const },
    { l: "FBCSP Algorithm", w: 125, x: 850, y: 618, b: "alternative" as const },
    { l: "Riemannian Geometry Covariance", w: 260, x: 715, y: 661, b: "recommended" as const },
  ].forEach((p, idx) => {
    nodes.push(createPill(`feat-${idx}`, p.l, p.x, p.y, p.w, p.b, sec2, sec2FeatTopic, p.l, "feat"));
  });

  const sec2DecTopic = sec2.topics[6] ?? sec2.title;
  [
    { l: "Linear Discriminant (LDA)", w: 125, x: 715, y: 770, b: "recommended" as const },
    { l: "Support Vector (SVM)", w: 125, x: 850, y: 770, b: "recommended" as const },
    { l: "Adaptive Kalman Filters", w: 260, x: 715, y: 813, b: "recommended" as const },
    { l: "EEGNet / ConvNet Decoders", w: 260, x: 715, y: 856, b: "recommended" as const },
    { l: "Transformer Intent Models", w: 260, x: 715, y: 899, b: "alternative" as const },
  ].forEach((p, idx) => {
    nodes.push(createPill(`dec-${idx}`, p.l, p.x, p.y, p.w, p.b, sec2, sec2DecTopic, p.l, "dec"));
  });

  // --------------------------------------------------------------------------
  // SECTION 3 (Milestone 3 - Telemetry & Safety)
  // --------------------------------------------------------------------------
  const sec2TelemTopic = sec2.topics[5] ?? "Closed-Loop Telemetry";
  edges.push({ id: "spine-m2-to-m3", type: "spine", path: "M 500 830 V 1000" });
  nodes.push({
    id: `m3-${field.id}`,
    type: "milestone-main",
    topicName: sec2TelemTopic,
    section: sec2,
    label: "Closed-Loop Telemetry & Safety",
    x: 375,
    y: 1000,
    width: 250,
    height: 44,
    badge: "recommended",
  });

  edges.push(
    { id: "spine-m3-to-sub0", type: "spine", path: "M 500 1044 V 1064" },
    { id: "spine-sub3-to-sub3-1", type: "spine", path: "M 500 1102 V 1120" },
  );
  nodes.push(
    createSub(`sub3-latency-${field.id}`, "Latency Budget (<15ms)", 1064, "recommended", sec2, sec2TelemTopic, "Latency Budget (<15ms)"),
    createSub(`sub3-watchdog-${field.id}`, "Real-Time Safety Watchdog", 1120, "recommended", sec2, sec2TelemTopic, "Real-Time Safety Watchdog"),
  );

  // Left branch from M3: Streaming Protocols & Advanced Project
  edges.push({ id: "m3-left-branch", group: "m3left", type: "radiating", path: "M 375 1022 C 340 1022, 310 1000, 275 1000" });
  ["UDP Causal Streaming", "Zero-Copy Shared Mem", "FPGA Neural Coprocessor", "Lockless Ring Buffers"].forEach((sp, idx) => {
    nodes.push(
      createPill(`stream-${idx}`, sp, 15 + (idx % 2) * 135, 1000 + Math.floor(idx / 2) * 42, 125, idx < 2 ? "recommended" : "alternative", sec2, sec2TelemTopic, sp, "m3left"),
    );
  });
  edges.push({ id: "stream-to-opt", type: "solid", path: "M 145 1076 V 1093" });
  nodes.push(
    {
      id: "stream-opt-milestone",
      type: "milestone-main",
      topicName: sec2TelemTopic,
      section: sec2,
      label: "Stream Engine Optimization",
      x: 15,
      y: 1093,
      width: 260,
      height: 38,
      badge: "recommended",
    },
    createProjectCard("proj-card-advanced", "Advanced", 1148, sec2TelemTopic, sec2, `Design an adversarial verification suite evaluating edge cases, latency boundaries, and safe shutdown for ${field.shortTitle}.`),
  );

  // Right branch from M3: SAFETY STANDARDS & LIMITS BOX
  sectionBoxes.push({ id: "sec-box-safety", title: "SAFETY STANDARDS & LIMITS", boxX: 705, boxY: 1000, boxW: 280, boxH: 215, labelX: 730, labelY: 990 });
  edges.push({ id: "m3-to-safety-box", group: "safety", type: "radiating", path: "M 625 1022 C 660 1022, 680 1100, 705 1100" });
  [
    { l: "Charge Density Limits (<30µC/cm²)", b: "recommended" as const },
    { l: "Thermal Dissipation (<1°C rise)", b: "recommended" as const },
    { l: "Hardware Watchdog Shutdown", b: "recommended" as const },
    { l: "Gliosis & Biocompatibility", b: "alternative" as const },
  ].forEach((si, idx) => {
    nodes.push(createPill(`safety-${idx}`, si.l, 715, 1015 + idx * 43, 260, si.b, sec2, sec2DecTopic, si.l, "safety"));
  });

  // Capstone Finale
  edges.push({ id: "spine-to-capstone", type: "spine", path: "M 500 1158 V 1270" });
  nodes.push({
    id: `capstone-${field.id}`,
    type: "capstone",
    topicName: sec2DecTopic,
    section: sec2,
    label: `Capstone: ${field.shortTitle} Synthesis & Integration`,
    x: 310,
    y: 1270,
    width: 380,
    height: 48,
    badge: "recommended",
  });

  return {
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: 1350,
    legendCard,
    curriculumCard,
    trackTitleNode,
    sectionBoxes,
    nodes,
    edges,
  };
}
