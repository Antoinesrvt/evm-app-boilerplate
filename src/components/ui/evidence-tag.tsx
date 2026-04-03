import { Chip } from "@heroui/react";

export function EvidenceTag({ type }: { type: "auto" | "ai" | "client" | "agency" | "system" }) {
  const config: Record<string, { color: "default" | "success" | "warning" | "danger" | "accent"; label: string }> = {
    auto: { color: "accent", label: "Auto" },
    ai: { color: "accent", label: "AI" },
    client: { color: "warning", label: "Client" },
    agency: { color: "default", label: "Agency" },
    system: { color: "default", label: "System" },
  };
  const c = config[type] || config.system;
  return <Chip size="sm" color={c.color} variant="soft">{c.label}</Chip>;
}
