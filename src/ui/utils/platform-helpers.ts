export function getPlatformsForField(fieldId: string): string[] {
  switch (fieldId) {
    case "bci":
      return ["OpenBCI Cyton", "Neuropixels 2.0", "Blackrock Utah", "Neuralink N1", "Intan RHD2000", "Kernel Flow", "g.tec g.USBamp", "BrainVision"];
    case "neuroscience":
      return ["Patch-Clamp Rig", "Two-Photon Laser", "Calcium Imaging", "Optogenetics Rig", "NeuroML Engine", "NEURON Simulator", "BrainGlobe Atlas", "Allen Brain Map"];
    case "haptics":
      return ["Piezoelectric", "Linear Resonators", "Pneumatic Valves", "Peltier Elements", "Ultrasonic MidAir", "Force Exoskeleton", "Cable Servos", "Magnetic Brakes"];
    case "virtual-environments":
      return ["Unreal Engine 5", "OpenXR Runtime", "WebXR Device API", "SteamVR Driver", "Foveated Raster", "HRTF Spatializer", "PhysX Engine", "Vulkan Pipeline"];
    case "hardware-architecture":
      return ["Neuromorphic ASICs", "FPGA Prototyping", "RISC-V Cores", "Ultra-Low Power", "Inductive Link", "Wireless Power", "Thermal Radiator", "Solid-State Cell"];
    case "software-frameworks":
      return ["RTOS Kernel", "Shared Ring-Buffer", "Zero-Copy IPC", "LSL LabStreaming", "Cap'n Proto RPC", "WebSocket Sync", "C++20 Causal", "Rust Concurrency"];
    case "sensory-substitution":
      return ["Tactile Belt Array", "vOICe Optical Audio", "Tongue Display (BrainPort)", "Electro-Tactile Glove", "Bone Conduction Rig", "Spatial Audio Array", "Retinal Prosthesis Lab", "Haptic Vest Matrix"];
    case "neural-decoding":
      return ["Pygatt / Bleak BCI", "TorchEEG Pipeline", "MNE-Python Suite", "Brain-Decode Framework", "TensorRT Engine", "ONNX Runtime BCI", "SpikeInterface", "BioSig Toolbox"];
    case "neural-stimulation":
      return ["tDCS / tACS Current Source", "TMS Transcranial Mag", "Focused Ultrasound (tFUS)", "Epidural Spinal Stim", "Optogenetic Laser Link", "Intracortical Microstim", "Vagus Nerve Stim (tVNS)", "Closed-Loop Stim Rig"];
    case "safety-and-ethics":
      return ["Hardware Interlock Rig", "ISO 14971 Risk Matrix", "SAR Thermal Phantom", "IEC 60601-1 Testbench", "Biocompatibility Lab", "Galvanic Isolation Bench", "Neuro-Rights Ledger", "IEC 62304 Audit Suite"];
    case "clinical-translation":
      return ["FDA IDE Testbed", "ISO 13485 QMS Matrix", "GCP Clinical Protocol", "MDR Class III Bench", "Sterilization Chamber", "Hermetic Sealing Rig", "Accelerated Aging Oven", "Veterinary Pilot Model"];
    case "future-frontiers":
      return ["Molecular Recording Rig", "Carbon Nanotube Arrays", "Synthetic Biology Synapse", "Superconducting Quantum (SQUID)", "Opto-Acoustic Tomography", "Neuromorphic Memristor", "Diamond NV Magnetometer", "Organoid Intelligence Rig"];
    default:
      return ["Standard Platform", "Reference Hardware", "Simulation Testbench", "Emulation Layer", "Telemetry Suite", "Driver Framework", "Bench Apparatus", "Evaluation Board"];
  }
}

export function getPlatformMilestoneTitle(fieldId: string): string {
  switch (fieldId) {
    case "bci": return "Pick Acquisition Platform";
    case "neuroscience": return "Pick Laboratory Apparatus";
    case "haptics": return "Select Actuator Architecture";
    case "virtual-environments": return "Select Runtime Engine";
    case "hardware-architecture": return "Select Compute Platform";
    case "software-frameworks": return "Select Core Framework";
    case "sensory-substitution": return "Select Transduction Medium";
    case "neural-decoding": return "Select Decoding Framework";
    case "neural-stimulation": return "Select Stimulation Modality";
    case "safety-and-ethics": return "Select Safety Framework";
    case "clinical-translation": return "Select Regulatory Pathway";
    case "future-frontiers": return "Select Frontier Probe";
    default: return "Select Primary Toolchain";
  }
}

export function getDenoisingMethodsForField(fieldId: string): string[] {
  switch (fieldId) {
    case "bci":
      return ["ICA Denoising", "Wavelet Transform", "Common Avg Ref", "Surface Laplacian", "EOG Regression", "Adaptive Filtering"];
    case "neuroscience":
      return ["Spike Sorting", "Drift Correction", "Optical Denoising", "Photobleach Fix", "Poisson Filtering", "Ensemble Averaging"];
    case "haptics":
      return ["Kalman Filtering", "Jitter Damping", "Impedance Control", "Hysteresis Model", "Thermal Limiting", "Back-EMF Sensing"];
    case "virtual-environments":
      return ["Temporal Anti-Alias", "Reprojection Wrap", "Latency Extrapolation", "Jitter Smoothing", "Pose Filtering", "Occlusion Culling"];
    case "sensory-substitution":
      return ["Cross-Modal Remapping", "Spectral Inversion", "Dynamic Range Compression", "Spatial Downsampling", "Edge Enhancement", "Phoneme Encoding"];
    case "neural-decoding":
      return ["Common Spatial Pattern", "Riemannian Tangent Space", "FBCSP Filtering", "Wavelet Packet Decomp", "Empirical Mode Decomp", "Spatial Whitening"];
    case "neural-stimulation":
      return ["Charge Balancing", "Active Charge Recovery", "Stimulation Artifact Rejection", "Pulse Width Shaping", "Thermal Dissipation Check", "Phase-Locked Triggering"];
    case "safety-and-ethics":
      return ["Thermal Budget Modeling", "Charge Injection Limit", "Adversarial Failsafe", "Heartbeat Watchdog", "Emergency Current Clamp", "Electrode Impedance Mon"];
    case "clinical-translation":
      return ["Biocompatibility Assay", "Failure Mode Effects (FMEA)", "Accelerated Degradation", "Leakage Current Test", "In Vitro Cytotoxicity", "Chronic Tissue Response"];
    case "future-frontiers":
      return ["Quantum Phase Estimation", "Super-Resolution Optical", "Nanoscale Drift Tracking", "Multiplexed DNA Barcoding", "Magnetoencephalography SQUID", "High-Throughput Patching"];
    default:
      return ["Linear Filtering", "Adaptive Smoothing", "Noise Cancellation", "Outlier Removal", "Spatial Averaging", "Frequency Notching"];
  }
}
