import type { LucideIcon, LucideProps } from "lucide-react";
import {
  Activity,
  Boxes,
  Brain,
  Code2,
  Compass,
  Cpu,
  Layers3,
  Microscope,
  Network,
  Rocket,
  ShieldCheck,
  Waves,
  Zap,
} from "lucide-react";

export function getFieldIcon(fieldId: string): LucideIcon {
  switch (fieldId) {
    case "neuroscience":
      return Brain;
    case "hardware-architecture":
      return Cpu;
    case "virtual-environments":
      return Boxes;
    case "bci":
      return Activity;
    case "haptics":
      return Waves;
    case "neural-modulation":
      return Zap;
    case "sensory-substitution":
      return Layers3;
    case "software-frameworks":
      return Code2;
    case "system-integration":
      return Network;
    case "ethical-engineering":
      return ShieldCheck;
    case "advanced-neural-mapping":
      return Microscope;
    case "future-frontiers":
      return Rocket;
    default:
      return Compass;
  }
}

export type FieldIconProps = LucideProps & {
  fieldId: string;
};

export function FieldIcon({ fieldId, ...props }: FieldIconProps) {
  const Icon = getFieldIcon(fieldId);
  return <Icon {...props} />;
}

export const fieldIcon = getFieldIcon;
