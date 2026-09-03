export type RoadmapCategory =
  | "Neural Science"
  | "Interfaces & Haptics"
  | "Virtual Systems"
  | "Hardware & Software"
  | "Safety & Integration"
  | "Frontier Research";

export type RoadmapSection = {
  id: string;
  title: string;
  summary: string;
  topics: string[];
  project: string;
};

export type RoadmapField = {
  id: string;
  title: string;
  shortTitle: string;
  category: RoadmapCategory;
  description: string;
  audience: string;
  duration: string;
  level: "Foundation" | "Intermediate" | "Advanced";
  sections: RoadmapSection[];
  prerequisites: string[];
  related: string[];
  isNew?: boolean;
};

export type TopicStatus = "learning" | "done" | "skipped";


const section = (id: string, title: string, summary: string, topics: string[], project: string): RoadmapSection => ({
  id, title, summary, topics, project,
});

export const roadmapFields: RoadmapField[] = [
  {
    id: "neuroscience",
    title: "Neuroscience Fundamentals",
    shortTitle: "Neuroscience",
    category: "Neural Science",
    description: "Understand how sensory systems, neurons, and population codes create perception and action.",
    audience: "New researchers and technical generalists",
    duration: "6–12 months",
    level: "Foundation",
    prerequisites: ["Basic biology", "Introductory statistics"],
    related: ["advanced-neural-mapping", "bci", "neural-modulation"],
    sections: [
      section("sensory-perception", "Sensory Perception", "Trace each sensory pathway from biological transduction to an integrated body model.", ["Visual processing pathways", "Auditory cortex mechanics", "Somatosensory system mapping", "Vestibular system integration", "Olfactory bulb signal transmission", "Proprioception and body schema", "Nociception signaling blocks"], "Create an interactive atlas connecting each sensory pathway to candidate read and write interfaces."),
      section("neural-coding", "Neural Coding", "Learn how individual neurons and ensembles represent, transform, and transmit information.", ["Action potential dynamics", "Synaptic transmission modeling", "Neuronal firing patterns", "Neural ensemble decoding", "Brain mapping techniques", "Signal transduction pathways", "Electrophysiology principles"], "Decode a small public neural dataset and publish a reproducible baseline with known limits."),
    ],
  },
  {
    id: "bci",
    title: "Brain–Computer Interfaces",
    shortTitle: "BCI",
    category: "Interfaces & Haptics",
    description: "Acquire neural activity, remove artifacts, extract features, and build honest real-time decoders.",
    audience: "Neurotechnology, data, and systems engineers",
    duration: "8–14 months",
    level: "Intermediate",
    prerequisites: ["Neuroscience Fundamentals", "Signals and probability"],
    related: ["neuroscience", "advanced-neural-mapping", "hardware-architecture"],
    sections: [
      section("signal-acquisition", "Signal Acquisition", "Compare invasive and non-invasive methods by resolution, stability, safety, and bandwidth.", ["Noninvasive EEG hardware", "Invasive electrode arrays", "Functional magnetic resonance", "Near infrared spectroscopy", "Neural dust sensors", "Electrocorticography arrays", "Optical neural interfacing"], "Build a sourced acquisition-method trade-off explorer with explicit safety and resolution limits."),
      section("signal-processing", "Signal Processing", "Turn noisy measurements into tested, calibrated, latency-aware features and predictions.", ["Artifact removal algorithms", "Neural noise filtering", "Feature extraction methods", "Signal amplification circuits", "Real time data streaming", "Latency reduction protocols", "Machine learning decoding"], "Reproduce a public motor-intent decoder and report leakage controls, latency, and failure cases."),
    ],
  },
  {
    id: "haptics",
    title: "Haptic Feedback Systems",
    shortTitle: "Haptics",
    category: "Interfaces & Haptics",
    description: "Engineer tactile actuation and kinesthetic resistance for embodied simulation and accessibility.",
    audience: "Mechanical, robotics, and interaction engineers",
    duration: "5–10 months",
    level: "Intermediate",
    prerequisites: ["Basic mechanics", "Embedded control"],
    related: ["virtual-environments", "system-integration", "sensory-substitution"],
    sections: [
      section("tactile-actuation", "Tactile Actuation", "Compare surface, wearable, and mid-air methods for producing controlled tactile cues.", ["Piezoelectric vibration arrays", "Electrotactile stimulation grids", "Pneumatic pressure bladders", "Thermal heating elements", "Thermal cooling elements", "Ultrasonic midair haptics", "Shape memory alloy fibers"], "Build a hardware-agnostic tactile command API and simulate three actuator profiles."),
      section("kinesthetic-resistance", "Kinesthetic Resistance", "Generate controllable force, resistance, and support without compromising safe exit.", ["Exoskeleton force feedback", "Cable driven resistance", "Magnetic particle braking", "Fluidic muscle actuators", "Torque controlled motors", "Variable stiffness joints", "Gravity compensation mechanisms"], "Prototype and document a fail-safe force-feedback joint in simulation or on a benchtop rig."),
    ],
  },
  {
    id: "neural-modulation",
    title: "Neural Modulation",
    shortTitle: "Neural Modulation",
    category: "Interfaces & Haptics",
    description: "Study stimulation methods together with the limits, monitoring, and shutdown systems they require.",
    audience: "Neuroscience and safety-focused contributors",
    duration: "8–16 months",
    level: "Advanced",
    prerequisites: ["Neuroscience Fundamentals", "Research ethics"],
    related: ["neuroscience", "bci", "ethical-engineering"],
    sections: [
      section("stimulation-techniques", "Stimulation Techniques", "Understand the targeting, dose, selectivity, and reversibility of candidate modulation methods.", ["Transcranial magnetic stimulation", "Deep brain stimulation", "Optogenetic neural control", "Focused ultrasound neuromodulation", "Transcranial direct current", "Temporal interference stimulation", "Neural circuit silencing"], "Create a stimulation-method evidence map that clearly separates human results from proposals."),
      section("safety-protocols", "Safety Protocols", "Make biological limits, monitoring, recovery, and independent shutdown explicit.", ["Charge density limits", "Thermal damage thresholds", "Neurotoxicity monitoring", "Seizure prevention algorithms", "Electrode biocompatibility", "Chronic implantation safety", "Emergency shutdown triggers"], "Draft a reviewable stimulation safety case with measurable limits and emergency states."),
    ],
  },
  {
    id: "virtual-environments",
    title: "Virtual Environment Design",
    shortTitle: "Virtual Environments",
    category: "Virtual Systems",
    description: "Build real-time spatial worlds and measure the latency, comfort, and sensory alignment behind presence.",
    audience: "XR, graphics, audio, and game developers",
    duration: "5–10 months",
    level: "Foundation",
    prerequisites: ["Programming fundamentals", "3D math"],
    related: ["haptics", "software-frameworks", "system-integration"],
    sections: [
      section("spatial-computing", "Spatial Computing", "Create coherent visual, acoustic, physical, and streamed world models.", ["Depth perception algorithms", "Occlusion rendering techniques", "Dynamic lighting models", "Global illumination physics", "Spatial audio propagation", "Real time physics engines", "Asset streaming architectures"], "Build and profile a stable interactive environment with spatial audio and deterministic replay."),
      section("presence-engineering", "Presence Engineering", "Measure the timing and calibration conditions needed for comfortable embodiment.", ["Vestibular ocular synchronization", "Low latency motion tracking", "Field of view optimization", "Frame rate stabilization", "Latency compensation logic", "User posture calibration", "Haptic sensory integration"], "Create an open presence lab that records latency, dropped frames, posture, and comfort outcomes."),
    ],
  },
  {
    id: "hardware-architecture",
    title: "Hardware Architecture",
    shortTitle: "Hardware",
    category: "Hardware & Software",
    description: "Design processing and power systems capable of safe, observable, low-latency neural workloads.",
    audience: "Electrical, chip, firmware, and platform engineers",
    duration: "8–16 months",
    level: "Advanced",
    prerequisites: ["Digital electronics", "Embedded systems"],
    related: ["bci", "software-frameworks", "system-integration"],
    sections: [
      section("processing-units", "Processing Units", "Compare specialized compute architectures by latency, power, memory, and verifiability.", ["Neuromorphic chip designs", "Parallel processing arrays", "Low power ASIC designs", "Integrated neural processors", "Quantum computing acceleration", "FPGA prototyping platforms", "High bandwidth memory access"], "Benchmark a neural-workload pipeline on an FPGA or a realistic hardware simulator."),
      section("power-management", "Power Management", "Treat power delivery, heat, lifetime, and fault containment as system constraints.", ["Inductive power transfer", "Solid state battery technology", "Energy harvesting methods", "Efficient voltage regulation", "Heat dissipation systems", "Wireless power delivery", "Battery life optimization"], "Model the power and thermal budget of a wearable neural interface under fault conditions."),
    ],
  },
  {
    id: "software-frameworks",
    title: "Software Frameworks",
    shortTitle: "Software Frameworks",
    category: "Hardware & Software",
    description: "Build deterministic control, sensor fusion, simulation, networking, and state synchronization layers.",
    audience: "Realtime, engine, and distributed-systems developers",
    duration: "6–12 months",
    level: "Intermediate",
    prerequisites: ["Software engineering", "Concurrent programming"],
    related: ["virtual-environments", "hardware-architecture", "system-integration"],
    sections: [
      section("control-logic", "Control Logic", "Move signals and state through bounded-latency, observable, recoverable software.", ["Asynchronous data processing", "Real time OS kernels", "Distributed sensor fusion", "Adaptive thresholding models", "Predictive movement modeling", "State synchronization engines", "Network protocol handling"], "Build a deterministic synthetic sensor-to-action loop with telemetry and recovery tests."),
      section("simulation-environments", "Simulation Environments", "Represent persistent physical and social worlds with testable behavior.", ["Physics engine integration", "Collision detection pipelines", "Material property simulation", "Environment persistence logic", "Object interaction scripting", "Avatar kinematics mapping", "Multi user synchronization"], "Publish a replayable multi-user test environment for input and feedback modules."),
    ],
  },
  {
    id: "sensory-substitution",
    title: "Sensory Substitution",
    shortTitle: "Sensory Substitution",
    category: "Virtual Systems",
    description: "Translate information across sensory channels and evaluate what is preserved, learned, or lost.",
    audience: "Perception, accessibility, DSP, and XR contributors",
    duration: "4–8 months",
    level: "Intermediate",
    prerequisites: ["Sensory neuroscience", "Signal processing"],
    related: ["neuroscience", "haptics", "virtual-environments"],
    sections: [
      section("visual-translation", "Visual Translation", "Encode spatial and visual structure through alternative channels or neural targets.", ["Auditory to visual mapping", "Tactile to visual conversion", "Edge detection data streams", "Depth mapping translation", "Color perception synthesis", "High resolution retinal display", "Neural visual pathway bypass"], "Build a non-clinical substitution prototype and measure task learning rather than subjective novelty."),
      section("auditory-translation", "Auditory Translation", "Transform visual, tactile, and environmental structure into interpretable sound.", ["Visual to auditory mapping", "Tactile to auditory conversion", "Frequency domain shifting", "Spatial audio reconstruction", "Environmental noise filtering", "Bone conduction delivery", "Synthetic sound synthesis"], "Create and evaluate a spatial sonification system using a bounded navigation task."),
    ],
  },
  {
    id: "ethical-engineering",
    title: "Ethical Engineering",
    shortTitle: "Ethics & Safety",
    category: "Safety & Integration",
    description: "Protect cognitive privacy, agency, identity, long-term wellbeing, and public accountability.",
    audience: "Every contributor, especially project leads",
    duration: "3–6 months",
    level: "Foundation",
    prerequisites: ["None"],
    related: ["neural-modulation", "system-integration", "advanced-neural-mapping"],
    sections: [
      section("cognitive-privacy", "Cognitive Privacy", "Design data and governance systems around autonomy, consent, and mental privacy.", ["Neural data encryption", "Brain state anonymization", "Access control mechanisms", "Data autonomy policies", "Memory integrity protection", "Thought recording restrictions", "Deception detection protocols"], "Threat-model a neural-data platform and publish privacy-preserving defaults and abuse cases."),
      section("biological-impact", "Biological Impact", "Track psychological, neurological, social, and regulatory consequences over time.", ["Long term neuroplasticity", "Psychological dependency risks", "Identity dissociation prevention", "Cognitive load management", "Social isolation mitigation", "Regulatory compliance standards", "Clinical safety oversight"], "Create a long-term risk register and incident escalation workflow for a community prototype."),
    ],
  },
  {
    id: "advanced-neural-mapping",
    title: "Advanced Neural Mapping",
    shortTitle: "Neural Mapping",
    category: "Neural Science",
    description: "Model functional circuits and represent neural activity without erasing uncertainty or individual variation.",
    audience: "Computational neuroscience and data contributors",
    duration: "10–18 months",
    level: "Advanced",
    prerequisites: ["Neuroscience Fundamentals", "Machine learning", "Statistics"],
    related: ["neuroscience", "bci", "sensory-substitution"],
    sections: [
      section("functional-connectomics", "Functional Connectomics", "Connect anatomy, dynamics, cognition, and behavior without overclaiming causal understanding.", ["Whole brain wiring diagrams", "Neural circuit classification", "Memory storage modeling", "Consciousness theory application", "Subconscious processing logs", "Emotional state tracking", "Attention span monitoring"], "Reproduce a small connectomics analysis and document every inference boundary."),
      section("data-compression", "Data Compression", "Represent large neural streams while measuring information loss and decoding impact.", ["Neural spike train encoding", "Sparse representation methods", "Redundancy reduction logic", "Delta encoding algorithms", "Quantization of neural states", "Feature based transmission", "Lossless signal archiving"], "Benchmark compression methods on open neural data using task-level error and latency metrics."),
    ],
  },
  {
    id: "system-integration",
    title: "System Integration",
    shortTitle: "System Integration",
    category: "Safety & Integration",
    description: "Calibrate users, connect subsystems, operate infrastructure, and preserve safe recovery across failures.",
    audience: "Systems architects, SREs, and integration leads",
    duration: "8–14 months",
    level: "Advanced",
    prerequisites: ["One interface roadmap", "Software Frameworks", "Safety fundamentals"],
    related: ["hardware-architecture", "software-frameworks", "ethical-engineering"],
    sections: [
      section("calibration-protocols", "Calibration Protocols", "Adapt the system to individual perception and physiology without hiding uncertainty.", ["Subjective perception tuning", "Personal baseline establishment", "Sensor alignment procedures", "Feedback intensity normalization", "Error correction loops", "Threshold sensitivity testing", "Adaptive profile management"], "Build a simulated calibration workflow with rollback, uncertainty, and audit logs."),
      section("infrastructure-support", "Infrastructure Support", "Connect edge, local, and distributed components with bounded failure domains.", ["Low latency mesh networking", "Cloud synchronization nodes", "Distributed compute clusters", "Edge data processing units", "Fiber optic backbone links", "Redundant backup systems", "Scalable hardware interfaces"], "Run a fault-injection exercise across an end-to-end simulated full-dive data path."),
    ],
  },
  {
    id: "future-frontiers",
    title: "Future Frontiers",
    shortTitle: "Future Frontiers",
    category: "Frontier Research",
    description: "Explore speculative directions while keeping them clearly separated from demonstrated capability.",
    audience: "Advanced researchers and speculative-design contributors",
    duration: "Open-ended",
    level: "Advanced",
    prerequisites: ["Evidence policy", "Relevant core discipline"],
    related: ["advanced-neural-mapping", "ethical-engineering", "system-integration"],
    isNew: true,
    sections: [
      section("synthetic-senses", "Synthetic Senses", "Frame new perceptual channels as falsifiable research questions rather than promises.", ["Electromagnetic wave perception", "Remote environment connection", "Shared consciousness experiments", "Neural skill downloading", "Collective memory sharing", "Digital dream architecture", "Augmented intuition interfaces"], "Write a sourced feasibility map for one synthetic sense with explicit disconfirmation criteria."),
      section("neuroplasticity-training", "Neuroplasticity Training", "Study capability change, fatigue, learning, recovery, and ethical limits.", ["Cognitive capability expansion", "Adaptive skill acquisition", "Mental fatigue recovery", "Memory consolidation boost", "Reflex speed acceleration", "Emotional regulation tuning", "Consciousness expansion drills"], "Design a safe, non-clinical learning protocol and preregister its outcomes and stopping rules."),
    ],
  },
];

export const masterRoadmap = {
  id: "full-dive-development",
  title: "Full-Dive VR Development",
  description: "The master integration path connecting every scientific, engineering, safety, and world-simulation field.",
  audience: "Community contributors choosing where to specialize",
  duration: "Multi-year, multidisciplinary",
};

export const roadmapFieldById = (id: string) => roadmapFields.find((field) => field.id === id);

export const slugifyTopic = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/**
 * Legacy `?track=` query aliases that must survive extraction: old bookmarks
 * and links used these names before the roadmaps had their current ids. The
 * host's route adapter redirects `?track=<alias>` to `/roadmap/<field id>`.
 * Kept here because they are Roadmap's own history, not the host's.
 */
export const legacyTrackAliases: Record<string, string> = {
  signals: "bci",
  simulation: "virtual-environments",
  safety: "ethical-engineering",
};
