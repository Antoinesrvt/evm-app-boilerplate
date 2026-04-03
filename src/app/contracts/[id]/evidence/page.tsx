"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Scale,
  MessageSquare,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, Chip, Spinner } from "@heroui/react";
import {
  PageHeader,
  SectionCard,
  StatusBadge,
} from "@/components/ui";
import { useApi } from "@/hooks/use-api";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface EvidenceItem {
  party: string;
  type: string;
  uri: string;
  description: string;
  submittedAt: string;
}

interface Dispute {
  id: string;
  milestoneId: number;
  phase: string;
  evidence: EvidenceItem[];
  createdAt: string;
  resolvedAt?: string;
  ruling?: number;
}

interface Milestone {
  id: number;
  name: string;
  amount: number;
  deadline?: string;
  status: string;
  proofHash?: string;
}

interface ContractDetail {
  id: string;
  title: string;
  status: string;
  category: string;
  totalValue: number;
  milestones: Milestone[];
  disputes?: Dispute[];
  createdAt: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);
}

const partyColors: Record<string, "default" | "success" | "warning" | "danger" | "accent"> = {
  client: "warning",
  agency: "default",
  ai: "accent",
  system: "default",
};

const partyLabels: Record<string, string> = {
  client: "Client",
  agency: "Agency",
  ai: "AI System",
  system: "System",
};

const typeLabels: Record<string, string> = {
  contract_spec: "Contract Spec",
  deliverable: "Deliverable",
  ai_attestation: "AI Attestation",
  argument: "Argument",
  document: "Document",
};

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function EvidencePage() {
  const { id } = useParams<{ id: string }>();
  const { data: contract, loading, error } = useApi<ContractDetail>(
    `/api/contracts/${id}`
  );

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" className="text-accent" />
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !contract) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          href={`/contracts/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to contract
        </Link>
        <Card className="border border-danger/30 bg-danger/5 rounded-xl shadow-none">
          <CardContent className="p-6 text-center text-danger font-medium">
            {error ?? "Contract not found"}
          </CardContent>
        </Card>
      </div>
    );
  }

  const disputes = contract.disputes ?? [];
  const approvedCount = contract.milestones.filter(
    (m) => m.status === "approved"
  ).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Back link */}
      <Link
        href={`/contracts/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground mb-8 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to contract
      </Link>

      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <Scale className="h-5 w-5 text-accent shrink-0" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Evidence Package
          </h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap text-sm text-muted mb-4">
          <span>
            Contract:{" "}
            <span className="font-semibold text-foreground">
              {contract.title}
            </span>
          </span>
          <span className="w-px h-3 bg-border" />
          <StatusBadge status={contract.status} />
        </div>

        {/* Public notice */}
        <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-surface-secondary text-sm text-muted">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-warning" />
          <p>
            This page is public. It is designed for dispute reviewers.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {/* ── Disputed Milestones ──────────────────────────────────────────── */}
        {disputes.length > 0 && (
          <section>
            <h2 className="text-base font-bold uppercase tracking-widest text-muted mb-4">
              Disputed Milestones
            </h2>
            <div className="space-y-4">
              {disputes.map((dispute) => {
                const milestone = contract.milestones.find(
                  (m) => m.id === dispute.milestoneId
                );
                if (!milestone) return null;
                return (
                  <SectionCard
                    key={dispute.id}
                    title={milestone.name}
                    icon={<FileText className="h-4 w-4 text-danger" />}
                  >
                    <div className="space-y-4">
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">
                            Amount
                          </p>
                          <p className="font-semibold text-foreground">
                            {formatCurrency(milestone.amount)}
                          </p>
                        </div>
                        {milestone.deadline && (
                          <div>
                            <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">
                              Deadline
                            </p>
                            <p className="font-semibold text-foreground">
                              {new Date(milestone.deadline).toLocaleDateString(
                                "en-US",
                                { year: "numeric", month: "short", day: "numeric" }
                              )}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">
                            Milestone Status
                          </p>
                          <StatusBadge status={milestone.status} />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-border/50">
                        <div>
                          <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">
                            Dispute Phase
                          </p>
                          <StatusBadge status={dispute.phase} />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">
                            Dispute Opened
                          </p>
                          <p className="text-sm text-foreground">
                            {formatDate(dispute.createdAt)}
                          </p>
                        </div>
                      </div>

                      {dispute.resolvedAt && (
                        <div className="pt-2 border-t border-border/50">
                          <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">
                            Resolved
                          </p>
                          <p className="text-sm text-foreground">
                            {formatDate(dispute.resolvedAt)}
                          </p>
                        </div>
                      )}

                      {milestone.proofHash && (
                        <div className="pt-2 border-t border-border/50">
                          <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">
                            Proof Hash
                          </p>
                          <code className="text-xs font-mono text-accent break-all">
                            {milestone.proofHash}
                          </code>
                        </div>
                      )}
                    </div>
                  </SectionCard>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Evidence Submissions ─────────────────────────────────────────── */}
        {disputes.some((d) => d.evidence.length > 0) && (
          <section>
            <h2 className="text-base font-bold uppercase tracking-widest text-muted mb-4">
              Evidence Submissions
            </h2>
            <div className="space-y-4">
              {disputes.flatMap((dispute) =>
                dispute.evidence.map((item, idx) => {
                  const milestone = contract.milestones.find(
                    (m) => m.id === dispute.milestoneId
                  );
                  const partyColor = partyColors[item.party] ?? "default";
                  const partyLabel = partyLabels[item.party] ?? item.party;
                  const typeLabel = typeLabels[item.type] ?? item.type;

                  return (
                    <Card
                      key={`${dispute.id}-evidence-${idx}`}
                      className="border border-border bg-surface rounded-xl shadow-sm"
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Chip
                              size="sm"
                              color={partyColor}
                              variant="soft"
                            >
                              {partyLabel}
                            </Chip>
                            <span className="text-xs text-muted">·</span>
                            <Chip size="sm" color="default" variant="soft">
                              {typeLabel}
                            </Chip>
                          </div>
                          {milestone && (
                            <span className="text-xs text-muted font-medium">
                              Re: {milestone.name}
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-foreground leading-relaxed mb-4">
                          {item.description}
                        </p>

                        <div className="flex items-center justify-between gap-4 pt-3 border-t border-border/50 flex-wrap">
                          <p className="text-xs text-muted">
                            Submitted:{" "}
                            <span className="text-foreground font-medium">
                              {formatDate(item.submittedAt)}
                            </span>
                          </p>
                          {item.uri && (
                            <a
                              href={item.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              View source
                            </a>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </section>
        )}

        {/* ── No disputes ──────────────────────────────────────────────────── */}
        {disputes.length === 0 && (
          <SectionCard
            title="No Disputes"
            icon={<Scale className="h-4 w-4 text-muted" />}
          >
            <p className="text-sm text-muted">
              No disputes have been opened for this contract.
            </p>
          </SectionCard>
        )}

        {/* ── Contract Summary ─────────────────────────────────────────────── */}
        <section>
          <h2 className="text-base font-bold uppercase tracking-widest text-muted mb-4">
            Contract Summary
          </h2>
          <SectionCard
            title="Overview"
            icon={<FileText className="h-4 w-4 text-muted" />}
          >
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
              <div>
                <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">
                  Category
                </p>
                <p className="font-semibold text-foreground capitalize">
                  {contract.category}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">
                  Total Value
                </p>
                <p className="font-semibold text-foreground">
                  {formatCurrency(contract.totalValue)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">
                  Milestones
                </p>
                <p className="font-semibold text-foreground">
                  {contract.milestones.length} total —{" "}
                  <span className="text-success">
                    {approvedCount} completed
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">
                  Created
                </p>
                <p className="font-semibold text-foreground">
                  {formatDate(contract.createdAt)}
                </p>
              </div>
            </div>
          </SectionCard>
        </section>
      </div>
    </div>
  );
}
