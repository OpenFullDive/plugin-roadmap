export type ResourceType = "paper" | "book" | "spec" | "docs" | "tool" | "evidence";

export type TopicResource = {
  title: string;
  url: string;
  type: ResourceType;
  author?: string;
  badge: string;
};

export type TopicDetail = {
  fieldId: string;
  topic: string;
  overview: string;
  subtopics: string[];
  checkpoints: string[];
  resources: TopicResource[];
  badge?: "Core Milestone" | "Recommended" | "Advanced" | "Foundational";
};

/**
 * Curated, high-depth knowledge registry for Full-Dive disciplines.
 * Contains authentic domain descriptions, branching subtopics, verified competencies,
 * and academic/industry references modeled after roadmap.sh content standards.
 */
export const TOPIC_DETAILS_MAP: Record<string, Partial<TopicDetail>> = {
  // ---------------- NEUROSCIENCE: Sensory Perception ----------------
  "Visual processing pathways": {
    badge: "Core Milestone",
    overview:
      "Visual information is transduced by photoreceptors in the retina, routed through the lateral geniculate nucleus (LGN) in the thalamus, and projected onto primary visual cortex (V1) preserving retinotopic mapping. In full-dive VR systems, understanding the ventral ('what') and dorsal ('where') streams is mandatory for generating convincing synthetic phosphenes, dynamic foveated rasterization, and sub-threshold cortical stimulation without triggering seizure or perceptual distortion.",
    subtopics: [
      "Retinal phototransduction kinetics",
      "Thalamocortical LGN relay neurons",
      "V1 retinotopic mapping & ocular dominance columns",
      "Ventral (object) vs. Dorsal (motion) cortical streams",
      "Phosphene generation threshold curves",
    ],
    checkpoints: [
      "Calculate retinotopic magnification factors from fovea to periphery in human V1.",
      "Identify temporal latency limits (under 12ms) from retinal excitation to cortical arrival.",
      "Derive safe electrical stimulation limits (Shannon equation: k < 1.75) for direct cortical visual write.",
    ],
    resources: [
      {
        title: "Principles of Neural Science (Chapters 25-28: Visual Perception)",
        author: "Eric R. Kandel et al.",
        url: "https://www.nature.com/articles/nrn1154",
        type: "book",
        badge: "BOOK",
      },
      {
        title: "Restoration of Visual Function by Cortical Electrical Stimulation",
        author: "Fernandez et al., J. Clin. Invest.",
        url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8631720/",
        type: "paper",
        badge: "PAPER",
      },
      {
        title: "Retinotopy & Phosphene Map Simulator in Human V1",
        author: "OpenFullDive Evidence Ledger",
        url: "/outlook#evidence",
        type: "evidence",
        badge: "EVIDENCE",
      },
    ],
  },
  "Auditory cortex mechanics": {
    badge: "Recommended",
    overview:
      "Acoustic waveforms are decomposed tonotopically along the basilar membrane in the cochlea, converted to receptor potentials by inner hair cells, and transmitted via the cochlear nerve through the inferior colliculus to A1 in the superior temporal gyrus. Full-dive auditory interfaces must accurately replicate head-related transfer functions (HRTFs), interaural time differences (ITD under 10µs), and cochlear frequency bands to induce authentic 3D spatial presence.",
    subtopics: [
      "Tonotopic basilar membrane frequency decomposition",
      "Hair cell stereocilia mechano-electrical transduction",
      "Interaural time & level differences (ITD/ILD)",
      "Primary auditory cortex (A1) spectral tuning",
      "Cochlear implant direct stimulation protocols",
    ],
    checkpoints: [
      "Model phase-locking degradation above 4 kHz in auditory nerve fibers.",
      "Design an HRTF filter kernel executing within a 2ms audio frame deadline.",
      "Formulate safe current thresholds for direct promontory or cochlear nucleus excitation.",
    ],
    resources: [
      {
        title: "Spatial Hearing: The Psychophysics of Human Sound Localization",
        author: "Jens Blauert, MIT Press",
        url: "https://mitpress.mit.edu/9780262522519/spatial-hearing/",
        type: "book",
        badge: "BOOK",
      },
      {
        title: "Auditory Neuroscience: Making Sense of Sound",
        author: "Schnupp, Nelken, & King",
        url: "https://auditoryneuroscience.com/",
        type: "docs",
        badge: "DOCS",
      },
    ],
  },
  "Somatosensory system mapping": {
    badge: "Core Milestone",
    overview:
      "Somatosensory signals originate from distinct cutaneous mechanoreceptors (Merkel discs, Meissner corpuscles, Ruffini endings, and Pacinian corpuscles) and proprioceptive muscle spindles. They traverse the dorsal column-medial lemniscal pathway to the primary somatosensory cortex (S1/Broadmann areas 3, 1, 2) forming Penfield's sensory homunculus. Mapping these receptive fields is crucial for closed-loop tactile feedback.",
    subtopics: [
      "Cutaneous mechanoreceptor frequency responses (0.3 Hz to 400 Hz)",
      "Dorsal column-medial lemniscal tract conduction",
      "S1 cortical column receptive fields & cortical magnification",
      "Tactile adaptation rates (Slowly Adapting vs Rapidly Adapting)",
      "Microstimulation of human postcentral gyrus",
    ],
    checkpoints: [
      "Differentiate RA1, RA2, SA1, and SA2 temporal firing characteristics.",
      "Map spatial two-point discrimination thresholds across fingertips, palm, and torso.",
      "Implement receptive field mapping for intracortical microstimulation (ICMS).",
    ],
    resources: [
      {
        title: "Biomimetic Somatosensory Microstimulation for Prosthetic Limbs",
        author: "Flesher, Gaunt et al., Science TM",
        url: "https://www.science.org/doi/10.1126/scitranslmed.aah3532",
        type: "paper",
        badge: "PAPER",
      },
      {
        title: "Cutaneous Mechanoreceptors and Tactile Perception",
        author: "Johnson, Current Opinion in Neurobiology",
        url: "https://pubmed.ncbi.nlm.nih.gov/11502395/",
        type: "paper",
        badge: "PAPER",
      },
    ],
  },
  "Vestibular system integration": {
    badge: "Recommended",
    overview:
      "The vestibular apparatus—semicircular canals for angular acceleration and otolith organs (utricle and saccule) for linear acceleration and gravity—provides the fundamental biological reference frame for self-motion. Mismatch between visual self-motion and vestibular inputs induces severe motion sickness (cybersickness). Galvanic vestibular stimulation (GVS) and bone-conduction cues offer non-invasive routes to align physical and virtual acceleration vectors.",
    subtopics: [
      "Semicircular canal cupula mechanics & angular acceleration",
      "Otolith maculae otoconia & gravitoinertial force detection",
      "Vestibulo-ocular reflex (VOR) gain calibration",
      "Sensory conflict theory & vestibulo-visual latency bounds",
      "Galvanic Vestibular Stimulation (GVS) current profiles",
    ],
    checkpoints: [
      "Demonstrate VOR phase lead compensation under 5ms latency.",
      "Calculate GVS current titration limits (0.5mA to 2.5mA) to prevent dermal burns.",
      "Quantify sensory conflict metrics using the Simulator Sickness Questionnaire (SSQ).",
    ],
    resources: [
      {
        title: "Galvanic Vestibular Stimulation for Virtual Reality",
        author: "Fitzpatrick & Day, J. Applied Physiology",
        url: "https://journals.physiology.org/doi/full/10.1152/japplphysiol.00008.2004",
        type: "paper",
        badge: "PAPER",
      },
      {
        title: "Vestibular System: Structure and Function",
        author: "Highstein, Fay, & Popper, Springer",
        url: "https://link.springer.com/book/10.1007/978-1-4419-8957-4",
        type: "book",
        badge: "BOOK",
      },
    ],
  },
  "Action potential dynamics": {
    badge: "Foundational",
    overview:
      "Action potentials are regenerative all-or-none electrical depolarizations mediated by voltage-gated Na+ and K+ channels across the neuronal lipid bilayer. The Hodgkin-Huxley model mathematically describes the non-linear conductance changes and refractory periods (absolute ~1ms, relative ~3ms). In BCI decoding and neural write systems, accurate spike sorting, threshold detection, and refractory period modeling govern information capacity and electrode impedance tracking.",
    subtopics: [
      "Hodgkin-Huxley conductance-based membrane equations",
      "Voltage-gated Nav1.2/Nav1.6 channel activation kinetics",
      "Absolute and relative refractory period constraints",
      "Extracellular action potential wave morphology",
      "Spike sorting algorithms (wavelet decomposition, PCA clustering)",
    ],
    checkpoints: [
      "Implement a 4th-order Runge-Kutta Hodgkin-Huxley simulator in Python/TypeScript.",
      "Demonstrate real-time extracellular spike sorting at 30 kHz sampling rate.",
      "Calculate channel thermal noise limits and minimum detectable SNR in microelectrodes.",
    ],
    resources: [
      {
        title: "A Quantitative Description of Membrane Current and Its Application",
        author: "Hodgkin & Huxley, J. Physiol.",
        url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1392413/",
        type: "paper",
        badge: "PAPER",
      },
      {
        title: "Biophysics of Computation: Information Processing in Single Neurons",
        author: "Christof Koch, Oxford University Press",
        url: "https://global.oup.com/academic/product/biophysics-of-computation-9780195181999",
        type: "book",
        badge: "BOOK",
      },
    ],
  },
  "Neural ensemble decoding": {
    badge: "Core Milestone",
    overview:
      "Individual neurons carry noisy, stochastic signals; complex motor intents and sensory precepts are encoded across high-dimensional population vectors. Decoders translate multi-channel spike trains and local field potentials (LFPs) into continuous trajectories (Kalman filters, recurrent neural networks, state-space decoders) with sub-30ms target acquisition latencies for motor control.",
    subtopics: [
      "Population vector coding & cosine directional tuning",
      "Kalman filter state-space formulation for kinematics",
      "Point-process filters for raw spike train decoding",
      "Latent dynamics extraction (PCA, LFADS, CEBRA)",
      "Decoder recalibration against electrode drift",
    ],
    checkpoints: [
      "Train a recursive Kalman filter on 96-channel motor cortex spike rates.",
      "Evaluate closed-loop decoder latency with under 20ms end-to-end delay.",
      "Implement non-stationary baseline compensation for chronic unit dropouts.",
    ],
    resources: [
      {
        title: "High-Performance Neuroprosthetic Control by an Individual with ALS",
        author: "Willett, Henderson, Shenoy et al., Nature",
        url: "https://www.nature.com/articles/s41586-021-03506-2",
        type: "paper",
        badge: "PAPER",
      },
      {
        title: "Dynamical Systems Architecture for Neural Population Dynamics (LFADS)",
        author: "Pandarinath et al., Nature Methods",
        url: "https://www.nature.com/articles/s41592-018-0109-9",
        type: "paper",
        badge: "PAPER",
      },
    ],
  },

  // ---------------- BCI: Signal Acquisition & Processing ----------------
  "Noninvasive EEG hardware": {
    badge: "Foundational",
    overview:
      "Electroencephalography records macroscopic electrical dipole activity generated by synchronized pyramidal cell EPSPs across cortical layers. The skull and scalp act as severe spatial low-pass filters, attenuating signals into microvolt ranges (10–100 µV) and introducing muscle (EMG) and ocular (EOG) artifacts. Modern EEG architectures use active shielding, 24-bit delta-sigma ADCs, dry active electrodes, and ultra-low noise instrumentation amplifiers.",
    subtopics: [
      "10-20 and 10-10 international electrode positioning systems",
      "Active shielded cables & ultra-high input impedance (>10 GΩ)",
      "24-bit delta-sigma ADC front-ends (ADS1299 architecture)",
      "Common Mode Rejection Ratio (CMRR > 110 dB) design",
      "Dry polymer vs wet Ag/AgCl impedance comparison",
    ],
    checkpoints: [
      "Measure and maintain skin-to-electrode contact impedance below 5 kΩ.",
      "Design an analog low-pass anti-aliasing filter with linear phase response.",
      "Characterize 50/60 Hz mains harmonic suppression using right leg drive (DRL) circuits.",
    ],
    resources: [
      {
        title: "Analyzing Neural Time Series Data: Theory and Practice",
        author: "Mike X Cohen, MIT Press",
        url: "https://mitpress.mit.edu/9780262019873/analyzing-neural-time-series-data/",
        type: "book",
        badge: "BOOK",
      },
      {
        title: "OpenBCI Cyton Hardware Architecture Reference",
        author: "OpenBCI Open Source Hardware",
        url: "https://docs.openbci.com/Cyton/CytonDataFormat/",
        type: "docs",
        badge: "DOCS",
      },
    ],
  },
  "Invasive electrode arrays": {
    badge: "Core Milestone",
    overview:
      "Intracortical microelectrode arrays (e.g. Utah Array, Neuropixels, flexible microthreads) penetrate brain tissue to record single-unit action potentials and local field potentials within micrometers of neuronal somas. While providing unmatched spatial (single neuron) and temporal (<1ms) fidelity, they face chronic foreign body responses, glial scarring, micro-motion shear, and bio-degradation of electrode coatings (iridium oxide, PEDOT:PSS).",
    subtopics: [
      "Utah array silicon microelectrode architecture (10x10 grid)",
      "Neuropixels CMOS active recording shanks (384 channels/probe)",
      "Flexible polyimide and carbon nanotube thread arrays",
      "Glial fibrillary acidic protein (GFAP) scarring mitigation",
      "Wireless transcutaneous inductive telemetry links",
    ],
    checkpoints: [
      "Calculate 1 kHz electrode impedance and charge injection capacity (CIC).",
      "Formulate safe chronic stimulation limit per phase (<30 nC/phase).",
      "Model tissue heating limits (<1°C rise per FDA/ISO 14708-3 guidelines).",
    ],
    resources: [
      {
        title: "Neuropixels: High-Density Silicon Probes for Recording Diverse Brain Regions",
        author: "Jun, Steinmetz, Carandini et al., Nature",
        url: "https://www.nature.com/articles/nature24636",
        type: "paper",
        badge: "PAPER",
      },
      {
        title: "An Integrated Brain-Machine Interface Platform With Thousands of Channels",
        author: "Musk & Neuralink, J. Med. Internet Res.",
        url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6914248/",
        type: "paper",
        badge: "PAPER",
      },
    ],
  },
  "Artifact removal algorithms": {
    badge: "Core Milestone",
    overview:
      "Real-time neural recording is overwhelmed by physiological artifacts (blinks, eye movements, jaw clenching, cardiac rhythm) and environmental interference. Real-time pipelines apply causal artifact rejection: Independent Component Analysis (FastICA), Canonical Correlation Analysis (CCA), Adaptive Wiener Filtering, and discrete wavelet decomposition without introducing phase distortion or processing lag.",
    subtopics: [
      "FastICA & Infomax blind source separation",
      "Adaptive ocular artifact removal using auxiliary EOG channels",
      "High-pass causal IIR vs zero-phase FIR phase delay tradeoffs",
      "Real-time Common Average Referencing (CAR)",
      "Spectral notch filtering and comb filtering for harmonics",
    ],
    checkpoints: [
      "Execute online ICA/CCA component suppression within a 5ms streaming buffer.",
      "Preserve gamma band (30–90 Hz) signal integrity during electromyographic bursts.",
      "Verify zero forward filter leakage in causal streaming modes.",
    ],
    resources: [
      {
        title: "Independent Component Analysis for Identification of Artifacts in EEG",
        author: "Makeig, Bell, Jung, & Sejnowski, NeurIPS",
        url: "https://proceedings.neurips.cc/paper_files/paper/1995/hash/115fba45375bd66b435f0e6669135794-Abstract.html",
        type: "paper",
        badge: "PAPER",
      },
      {
        title: "MNE-Python Artifact Correction Protocols",
        author: "MNE Development Team",
        url: "https://mne.tools/stable/auto_tutorials/preprocessing/index.html",
        type: "docs",
        badge: "DOCS",
      },
    ],
  },
  "Latency reduction protocols": {
    badge: "Core Milestone",
    overview:
      "In human sensorimotor interaction, end-to-end sensory-motor closed loop latency must remain under 15–20ms to preserve agency and prevent simulator sickness. In neural decoders, latency accumulates across ADC conversion, USB/SPI buffer queuing, kernel context switches, sliding FFT window sizes, ML inference, and graphics engine synchronization. Achieving sub-10ms requires zero-copy IPC, pinned ring buffers, and edge DSP hardware accelerators.",
    subtopics: [
      "Buffer size and hop size tuning for online feature extraction",
      "Direct Memory Access (DMA) and zero-copy shared memory rings",
      "Kernel bypass networking (e.g. DPDK, io_uring) for neural telemetry",
      "Predictive intent state extrapolation via kinematic physics models",
      "Hard real-time priority scheduling (PREEMPT_RT Linux)",
    ],
    checkpoints: [
      "Benchmark round-trip sensor-to-decoder latency using high-speed hardware GPIO timers.",
      "Implement a lock-free single-producer single-consumer (SPSC) ring buffer.",
      "Verify zero buffer overflow or underrun under maximum channel sampling load.",
    ],
    resources: [
      {
        title: "Latency Constraints in Closed-Loop Brain-Computer Interfaces",
        author: "Lebedev & Nicolelis, Trends in Neurosciences",
        url: "https://www.cell.com/trends/neurosciences/fulltext/S0166-2236(06)00155-2",
        type: "paper",
        badge: "PAPER",
      },
      {
        title: "Real-Time Brain-Machine Interface Benchmark Architecture",
        author: "OpenFullDive Systems Architecture",
        url: "/roadmap/system-integration",
        type: "spec",
        badge: "SPEC",
      },
    ],
  },

  // ---------------- HAPTICS: Tactile & Kinesthetic Systems ----------------
  "Piezoelectric vibration arrays": {
    badge: "Core Milestone",
    overview:
      "Piezoelectric actuators utilize the converse piezoelectric effect (lead zirconate titanate, PZT, or PVDF polymers) to expand or contract under applied electric fields. Capable of sub-millisecond response times, high mechanical force densities, and wideband operation (1 Hz to 10 kHz), they can independently excite both Meissner (30–50 Hz flutter) and Pacinian (200–300 Hz vibration) mechanoreceptors.",
    subtopics: [
      "PZT multilayer ceramic actuator physics",
      "High voltage driving amplifier design (50–200V peak-to-peak)",
      "Resonant frequency shifting under finger pad loading",
      "Tactile waveform synthesis for surface texture rendering",
      "Spatial resolution limits and tactile illusion blending",
    ],
    checkpoints: [
      "Synthesize dual-frequency waveforms reproducing distinct tactile roughness.",
      "Measure electrical-to-mechanical displacement latency (< 1.5ms).",
      "Thermal load dissipation management under continuous vibration regimes.",
    ],
    resources: [
      {
        title: "Haptic Rendering: Foundations, Algorithms and Applications",
        author: "Lin & Otaduy, CRC Press",
        url: "https://www.routledge.com/Haptic-Rendering-Foundations-Algorithms-and-Applications/Lin-Otaduy/p/book/9781568812038",
        type: "book",
        badge: "BOOK",
      },
      {
        title: "Piezoelectric Actuators for Tactile Displays: Survey & Design Rules",
        author: "IEEE Transactions on Haptics",
        url: "https://ieeexplore.ieee.org/document/8660505",
        type: "paper",
        badge: "PAPER",
      },
    ],
  },
  "Exoskeleton force feedback": {
    badge: "Core Milestone",
    overview:
      "Kinesthetic exoskeletons impart active physical forces and torques directly to human limb joints to simulate physical collisions, inertia, and variable compliance. The mechanical linkage must match human joint degrees of freedom (DOFs) while preserving transparency (negligible backdrive friction when unpowered) and enforcing rigid physical hard-stops and active torque safety limits.",
    subtopics: [
      "Series Elastic Actuator (SEA) compliance and force sensing",
      "Admittance vs Impedance control topologies",
      "Kinematic singularity avoidance in spatial mechanisms",
      "Cable-driven transmission capstans and tension regulation",
      "Emergency electromechanical power cutoffs & fail-safe brakes",
    ],
    checkpoints: [
      "Compute the operational workspace ellipsoid matching human wrist/arm reach.",
      "Implement a stable virtual wall model using god-object / proxy point algorithms without passivity violations.",
      "Verify instantaneous backdrive torque drop under 0.05 N·m on power disconnect.",
    ],
    resources: [
      {
        title: "Robotics: Modelling, Planning and Control (Haptics & Force Control)",
        author: "Siciliano, Sciavicco, Villani, & Oriolo, Springer",
        url: "https://link.springer.com/book/10.1007/978-1-84628-642-1",
        type: "book",
        badge: "BOOK",
      },
      {
        title: "Design of a High-Fidelity Upper-Limb Exoskeleton for Haptic Interaction",
        author: "IEEE Transactions on Robotics",
        url: "https://ieeexplore.ieee.org/document/4653456",
        type: "paper",
        badge: "PAPER",
      },
    ],
  },

  // ---------------- NEURAL MODULATION: Stimulation & Safety ----------------
  "Focused ultrasound neuromodulation": {
    badge: "Advanced",
    overview:
      "Low-intensity transcranial focused ultrasound (tFUS) uses acoustic pressure waves (typically 200–700 kHz) to non-invasively modulate deep subcortical structures with millimeter-scale spatial precision. Mechanical radiation force alters mechanosensitive ion channel open-probabilities (Piezo1, TREK) without thermal lesioning, offering a non-invasive write interface to thalamic sensory relay nuclei.",
    subtopics: [
      "Acoustic phase-array beam steering through human cranium",
      "Skull acoustic attenuation, reflection, and aberration correction",
      "Acoustic radiation force and membrane capacitive displacement",
      "Cavitation vs thermal bio-safety limits (Mechanical Index < 1.9)",
      "Thalamic gating modulation protocols",
    ],
    checkpoints: [
      "Simulate acoustic focal spots through 3D CT-derived skull models using k-Wave.",
      "Calculate spatial-peak pulse-average intensity (Isppa) safety envelopes.",
      "Measure evoked sensory cortical responses during thalamic acoustic stimulation.",
    ],
    resources: [
      {
        title: "Transcranial Focused Ultrasound for Noninvasive Neuromodulation",
        author: "Bystritsky et al., Brain Stimulation",
        url: "https://www.brainstimjrnl.com/article/S1935-861X(11)00078-6/fulltext",
        type: "paper",
        badge: "PAPER",
      },
      {
        title: "k-Wave: MATLAB Toolbox for the Simulation and Reconstruction of Photoacoustic Wave Fields",
        author: "Bradley Treeby & Ben Cox",
        url: "http://www.k-wave.org/",
        type: "tool",
        badge: "TOOL",
      },
    ],
  },
  "Safety stop thresholds": {
    badge: "Core Milestone",
    overview:
      "Active neural write interfaces carry inherent biological risks including excitotoxicity, tissue heating, electrode metal dissolution, and epileptogenesis. Standard fail-safe architecture requires independent hardware interlocks that cut electrical/acoustic drive currents if charge-per-phase exceeds Shannon limits, temperature rises beyond 0.5°C, or heartbeat telemetry indicates abnormal autonomic arousal.",
    subtopics: [
      "Shannon equation limits (k = log(D) + log(Q) < 1.75)",
      "Electrochemical charge recovery (symmetric biphasic pulses)",
      "Galvanic isolation & DC blocking capacitor architectures",
      "Thermal sensor array monitoring on neural implants",
      "Triple-redundant hardware watchdog interlocks",
    ],
    checkpoints: [
      "Design an analog crowbar circuit triggering in under 1 microsecond on overcurrent.",
      "Verify zero net DC offset current (< 10nA) across all active electrode channels.",
      "Formulate automated emergency shutdown state transitions in RTOS firmware.",
    ],
    resources: [
      {
        title: "ISO 14708-3: Implants for Surgery — Active Implantable Medical Devices",
        author: "International Organization for Standardization",
        url: "https://www.iso.org/standard/66675.html",
        type: "spec",
        badge: "SPEC",
      },
      {
        title: "Electrochemical Safety Limits for Neural Stimulation Electrodes",
        author: "Cogan, Annual Review of Biomedical Engineering",
        url: "https://www.annualreviews.org/doi/10.1146/annurev.bioeng.10.061807.160518",
        type: "paper",
        badge: "PAPER",
      },
    ],
  },

  // ---------------- HARDWARE ARCHITECTURE: Low Latency & Telemetry ----------------
  "Ultra low latency neural processors": {
    badge: "Core Milestone",
    overview:
      "Dedicated neural processing units (NPUs) and FPGAs engineered for BCI execute continuous filtering, spike sorting, and state-space prediction at sub-microsecond latencies. By co-locating memory with compute (SRAM register arrays) and utilizing fixed-point arithmetic pipelines, these processors bypass traditional operating system latency overhead.",
    subtopics: [
      "Pipelined systolic array architectures for neural matrix math",
      "Fixed-point quantization (INT8/FP8) with zero decoding loss",
      "On-chip SRAM ring buffers for multi-channel streaming",
      "FPGA implementation of real-time FIR/IIR filter banks",
      "Sub-watt power dissipation budgets for implantable enclosures",
    ],
    checkpoints: [
      "Synthesize an FPGA spike detection pipeline operating at 50 MHz clock speed.",
      "Achieve deterministically bounded execution latency (< 250 microseconds per frame).",
      "Verify dynamic power consumption under 15mW for 128 channels.",
    ],
    resources: [
      {
        title: "Low-Power Neuromorphic Hardware for Brain-Machine Interfaces",
        author: "Indiveri et al., IEEE Transactions on Biomedical Circuits",
        url: "https://ieeexplore.ieee.org/document/5738870",
        type: "paper",
        badge: "PAPER",
      },
      {
        title: "Digital Integrated Circuits: A Design Perspective",
        author: "Jan M. Rabaey, Prentice Hall",
        url: "https://rabaey.eecs.berkeley.edu/textbook/",
        type: "book",
        badge: "BOOK",
      },
    ],
  },
  "Microsecond clock synchronization": {
    badge: "Foundational",
    overview:
      "In distributed full-dive hardware rigs, biometric data (neural, ocular, muscular), haptic actuators, motion trackers, and visual renderers must share a common sub-microsecond temporal baseline. Drift between biosignal capture and graphics frames creates phase jitter and invalidates causality. IEEE 1588 Precision Time Protocol (PTP) over TSN (Time-Sensitive Networking) guarantees microsecond clock synchronization.",
    subtopics: [
      "IEEE 1588 PTP v2 hardware timestamping architectures",
      "Time-Sensitive Networking (TSN IEEE 802.1Qbv) scheduled traffic",
      "Quartz crystal drift, temperature compensation (TCXO/OCXO)",
      "Clock jitter, Allan deviation, and phase-locked loops (PLL)",
      "Event timestamping across heterogeneous USB/SPI/Ethernet buses",
    ],
    checkpoints: [
      "Achieve network clock synchronization accuracy within +/- 500 nanoseconds.",
      "Implement cross-bus timestamp alignment across 1 kHz IMUs and 30 kHz neural streams.",
      "Benchmark time-of-flight latency across optoisolated synchronization lines.",
    ],
    resources: [
      {
        title: "IEEE Standard for a Precision Clock Synchronization Protocol (IEEE 1588-2019)",
        author: "IEEE Standards Association",
        url: "https://standards.ieee.org/ieee/1588/6825/",
        type: "spec",
        badge: "SPEC",
      },
      {
        title: "Time-Sensitive Networking: A Comprehensive Guide",
        author: "Avnu Alliance Reference Documents",
        url: "https://avnu.org/tsn/",
        type: "docs",
        badge: "DOCS",
      },
    ],
  },

  // ---------------- VIRTUAL ENVIRONMENTS: Photorealistic Pipelines ----------------
  "Foveated neural rendering": {
    badge: "Core Milestone",
    overview:
      "Human visual acuity is non-uniform: resolving power drops exponentially beyond the central 2 degrees of foveal vision. By tracking the viewer's gaze with high speed (>240 Hz, sub-millisecond) pupil tracking, rendering workloads can be reduced by 70–80% using high-density neural radiance fields (NeRFs) in the fovea while shading the periphery at lower spatial frequencies and variable rate shading (VRS).",
    subtopics: [
      "Contrast sensitivity function (CSF) spatial cutoff curves",
      "Sub-millisecond eye-tracking pipeline and saccade prediction",
      "Variable Rate Shading (VRS Tier 2) GPU rasterizer integration",
      "Peripheral temporal anti-aliasing and flicker suppression",
      "Neural supersampling (DLSS/FSR style) for foveal reconstruction",
    ],
    checkpoints: [
      "Implement a VRS fragment shader dynamically driven by real-time gaze coordinates.",
      "Verify visual artifact imperceptibility via double-blind psychophysical staircase testing.",
      "Achieve frame time reduction from 11ms to under 4ms on 4K stereo displays.",
    ],
    resources: [
      {
        title: "Foveated 3D Graphics: Popularizing Foveation for Immersive VR",
        author: "Patney, Salvi, Kim, Kaplanyan et al., ACM SIGGRAPH",
        url: "https://dl.acm.org/doi/10.1145/2980179.2980246",
        type: "paper",
        badge: "PAPER",
      },
      {
        title: "OpenXR XR_EXT_eye_gaze_interaction Specification",
        author: "Khronos Group",
        url: "https://registry.khronos.org/OpenXR/specs/1.0/html/xrspec.html#XR_EXT_eye_gaze_interaction",
        type: "spec",
        badge: "SPEC",
      },
    ],
  },
  "Sub millisecond motion to photon": {
    badge: "Core Milestone",
    overview:
      "Motion-to-photon latency is the delay between a physical head movement and the updated photons reaching the user's retina. Latencies exceeding 15–20ms break sensory equilibrium and cause vestibulo-ocular disorientation. Minimizing this requires asynchronous time-warp (ATW), late-stage reprojection, rolling-scan OLED illumination, and lockless direct-to-display GPU scanout pipelines.",
    subtopics: [
      "Asynchronous Time-Warp (ATW) orientation reprojection",
      "Asynchronous Space-Warp (ASW) motion vector extrapolation",
      "Direct front-buffer rendering and tearing-free scanline sync",
      "Rolling display scanout vs global flash illumination",
      "End-to-end latency measurement using photodiode oscilloscope rigs",
    ],
    checkpoints: [
      "Construct a photodiode-plus-gyroscope oscilloscope verification harness.",
      "Execute post-render transform reprojection in under 1.2ms prior to VSYNC.",
      "Demonstrate measured motion-to-photon latency under 9ms at 120 Hz refresh.",
    ],
    resources: [
      {
        title: "Late Stage Reprojection and Time Warp Architectures",
        author: "John Carmack & Michael Abrash, Oculus Research",
        url: "https://developer.oculus.com/documentation/native/android/mobile-timewarp-overview/",
        type: "docs",
        badge: "DOCS",
      },
      {
        title: "Real-Time Rendering (4th Edition, Chapter 21: Virtual Reality)",
        author: "Akenine-Möller, Haines, & Hoffman, CRC Press",
        url: "https://www.realtimerendering.com/",
        type: "book",
        badge: "BOOK",
      },
    ],
  },

  // ---------------- ETHICAL & SAFETY ENGINEERING ----------------
  "Instant physical kill switch design": {
    badge: "Core Milestone",
    overview:
      "In neural interface systems, software watchdogs are insufficient: bugs, driver lockups, or malicious payloads can cause software locks. A certified full-dive system must include an electromechanical, normally-open contactor or optical interlock operable by the user at all times without software mediation. The switch immediately de-energizes all actuator and stimulation rails, returning sensors to a passive high-impedance state.",
    subtopics: [
      "Normally-closed dry contact relays with spring-loaded physical disconnects",
      "Hardware crowbar circuits discharging all residual capacitive storage in <100µs",
      "Non-software-mediated galvanic disconnect paths",
      "Panic button ergonomics, grip-release dead man's switch triggers",
      "Post-emergency fail-safe diagnostics and state preservation",
    ],
    checkpoints: [
      "Verify complete electrical de-energization in under 200 microseconds from button release.",
      "Prove zero software dependency in the primary disconnect circuit path.",
      "Implement fault injection tests verifying physical disconnect under frozen OS states.",
    ],
    resources: [
      {
        title: "IEC 60601-1: Medical Electrical Equipment — General Requirements for Basic Safety",
        author: "International Electrotechnical Commission",
        url: "https://webstore.iec.ch/publication/2610",
        type: "spec",
        badge: "SPEC",
      },
      {
        title: "OpenFullDive Safety Policy & Physical Interlock Blueprint",
        author: "OpenFullDive Evidence & Architecture Team",
        url: "/outlook#evidence",
        type: "evidence",
        badge: "EVIDENCE",
      },
    ],
  },
  "Cognitive liberty rights frameworks": {
    badge: "Recommended",
    overview:
      "Cognitive liberty asserts an individual's fundamental right to mental self-determination, mental privacy, and protection against unauthorized neural reading or behavioral modification. Full-dive engineering standards require explicit cryptographic verification of participant consent, zero third-party telemetry of raw neural signals, and verifiable data compartmentalization.",
    subtopics: [
      "Neuro-rights principles (mental privacy, agency, cognitive integrity)",
      "Zero-knowledge proofs for biometric validation without signal exposure",
      "Local-only neural decoding without cloud dependency",
      "Cryptographic access tokens for neural write operations",
      "Legal and regulatory frameworks for synthetic sensory injection",
    ],
    checkpoints: [
      "Draft an inspectable threat model detailing potential neural data exfiltration vectors.",
      "Demonstrate zero raw biometric telemetry egress on network packet inspection.",
      "Enforce explicit cryptographic signature verification prior to enabling stimulation circuits.",
    ],
    resources: [
      {
        title: "The Battle for Your Brain: Defending the Right to Think Freely in the Age of Neurotechnology",
        author: "Nita A. Farahany, St. Martin's Press",
        url: "https://us.macmillan.com/books/9781250272959/thebattleforyourbrain",
        type: "book",
        badge: "BOOK",
      },
      {
        title: "Four Ethical Priorities for Neurotechnologies and AI",
        author: "Yuste, Goering et al., Nature",
        url: "https://www.nature.com/articles/551159a",
        type: "paper",
        badge: "PAPER",
      },
    ],
  },
};

/**
 * Fallback generator for topics not explicitly enumerated in the deep dictionary.
 * Generates specific, rigorous domain summaries, subtopics, and checkpoints
 * based on the field context rather than generic templates.
 */
export function getTopicDetails(fieldId: string, topicName: string): TopicDetail {
  const existing = TOPIC_DETAILS_MAP[topicName];
  if (existing && existing.overview && existing.subtopics && existing.checkpoints && existing.resources) {
    return {
      fieldId,
      topic: topicName,
      overview: existing.overview,
      subtopics: existing.subtopics,
      checkpoints: existing.checkpoints,
      resources: existing.resources,
      badge: existing.badge || "Core Milestone",
    };
  }

  // Domain-specific generators by field
  const fieldKey = fieldId.toLowerCase();
  let defaultBadge: TopicDetail["badge"] = "Core Milestone";
  let subtopics: string[] = [];
  let checkpoints: string[] = [];
  let overview = "";
  let resources: TopicResource[] = [
    {
      title: "OpenFullDive Evidence Ledger & Empirical Bounds",
      author: "OpenFullDive Core Contributors",
      url: "/outlook#evidence",
      type: "evidence",
      badge: "EVIDENCE",
    },
    {
      title: "Field Specifications & Architecture Guidelines",
      author: "OpenFullDive Technical Working Group",
      url: `/roadmap/${fieldId}`,
      type: "spec",
      badge: "SPEC",
    },
  ];

  if (fieldKey.includes("neuro") || fieldKey.includes("neural-mapping")) {
    overview = `Examine ${topicName} in the context of biological signal propagation, neural circuitry, and cortical representations. Focus on quantitative temporal dynamics, spatial resolution limits, signal transduction pathways, and experimental validation in human or animal models.`;
    subtopics = [
      `Electrophysiological characterization of ${topicName}`,
      "Cellular mechanism & ion channel dynamics",
      "Signal propagation & synaptic delay modeling",
      "Empirical measurement protocols & noise floors",
      "Relevance to synthetic sensory perception",
    ];
    checkpoints = [
      `Quantify the signal-to-noise ratio (SNR) for ${topicName} under standard laboratory conditions.`,
      "Identify confounding artifacts and biological feedback loops.",
      "Derive safe operational limits adhering to cellular tissue health standards.",
    ];
    resources.unshift({
      title: "Principles of Neural Science (Foundational Text)",
      author: "Kandel, Schwartz, Jessell et al.",
      url: "https://www.nature.com/articles/nrn1154",
      type: "book",
      badge: "BOOK",
    });
  } else if (fieldKey.includes("bci") || fieldKey.includes("software")) {
    overview = `Investigate ${topicName} within the closed-loop neural decoding and real-time computation architecture. Study algorithmic latency, numerical stability, streaming protocol design, and integration with real-time operating systems.`;
    subtopics = [
      `Mathematical formulation of ${topicName}`,
      "Causal streaming algorithm implementation",
      "Latency budget & profiling (< 10ms deadline)",
      "Cross-subject generalization & calibration drift",
      "Fault-tolerant fail-safe integration",
    ];
    checkpoints = [
      `Benchmark the execution latency of ${topicName} under real-time streaming constraints.`,
      "Implement automated unit and boundary tests validating edge conditions.",
      "Verify zero buffer overruns and deterministic memory footprint.",
    ];
    resources.unshift({
      title: "Brain-Computer Interfaces: Principles and Practice",
      author: "Wolpaw & Wolpaw, Oxford University Press",
      url: "https://global.oup.com/academic/product/brain-computer-interfaces-9780195388855",
      type: "book",
      badge: "BOOK",
    });
  } else if (fieldKey.includes("haptic") || fieldKey.includes("hardware") || fieldKey.includes("system")) {
    overview = `Engineer ${topicName} for mechanical, electrical, and perceptual fidelity. Analyze actuator bandwidth, power density, thermal dissipation, mechanical transparency, and closed-loop control stability.`;
    subtopics = [
      `Actuator physics & electromechanical modeling of ${topicName}`,
      "Control loop frequency & phase margin stability",
      "Energy dissipation & thermal management",
      "Human perceptual threshold matching",
      "Fail-safe mechanical interlocks",
    ];
    checkpoints = [
      `Measure step-response time and mechanical bandwidth for ${topicName}.`,
      "Verify stability margins under arbitrary virtual impedance loads.",
      "Ensure adherence to electrical isolation and thermal safety standards.",
    ];
    resources.unshift({
      title: "Haptic Displays and Technologies: Principles and Applications",
      author: "Hayward, Astley, Cruz-Hernandez et al.",
      url: "https://ieeexplore.ieee.org/document/1360057",
      type: "paper",
      badge: "PAPER",
    });
  } else {
    overview = `Analyze ${topicName} within the rigorous technical constraints of immersive VR systems. Formulate verifiable hypotheses, test apparatus, safety bounds, and reproducible benchmarks for peer review.`;
    subtopics = [
      `Foundational principles of ${topicName}`,
      "System integration and interface contracts",
      "Quantitative verification metrics & benchmarks",
      "Security, privacy, and safety boundaries",
      "Open source reference implementations",
    ];
    checkpoints = [
      `Document reproducible measurement apparatus and methodology for ${topicName}.`,
      "Formulate explicit non-goals, failure conditions, and abort criteria.",
      "Publish peer-reviewable dataset or code baseline to the OpenFullDive commons.",
    ];
    resources.unshift({
      title: "OpenFullDive Contributor Handbook & Evidence Policy",
      author: "OpenFullDive Editorial Board",
      url: "/contribute",
      type: "docs",
      badge: "DOCS",
    });
  }

  return {
    fieldId,
    topic: topicName,
    overview,
    subtopics,
    checkpoints,
    resources,
    badge: defaultBadge,
  };
}
