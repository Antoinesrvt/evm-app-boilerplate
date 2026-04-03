"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Coins, Loader2, Eye, ShieldCheck, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { useContract, tokenizeContract } from "@/hooks/use-contracts";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Button, Input } from "@heroui/react";
import { PageHeader, SectionCard } from "@/components/ui";
import type { TokenizationExposure } from "@/lib/types/contract";
import Link from "next/link";

type Step = "form" | "confirm" | "broadcasting" | "success";

export default function TokenizePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { contract, loading: contractLoading } = useContract(id);
  const { getAuthToken, walletAddress } = useAuth();

  const totalValue = contract?.totalValue ?? 45000;
  const contractTitle = contract?.title ?? "Contract";

  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [discountPct, setDiscountPct] = useState(10); // % discount for investors
  const [step, setStep] = useState<Step>("form");

  // Derived from discount slider
  const pricePerToken = Number(((1 - discountPct / 100)).toFixed(4));
  const totalSupply = totalValue; // 1 token = $1 face value
  const investorCost = totalValue * pricePerToken;
  const investorYield = totalValue - investorCost;
  const investorYieldPct = discountPct > 0 ? ((1 / (1 - discountPct / 100) - 1) * 100) : 0;
  const [error, setError] = useState<string | null>(null);

  // Exposure settings — all default to OFF (conservative)
  const [exposure, setExposure] = useState<TokenizationExposure>({
    showDescription: false,
    showMilestones: false,
    showDisputeHistory: false,
  });

  // Derive defaults from contract title
  const defaultName = `${contractTitle.replace(/\s+/g, "-")}-Token`;
  const defaultSymbol = contractTitle.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 5) || "TKN";

  const handleReviewClick = () => {
    setError(null);
    setStep("confirm");
  };

  const handleConfirmTokenize = async () => {
    setStep("broadcasting");
    setError(null);
    try {
      const token = await getAuthToken();
      await tokenizeContract(id, {
        tokenName: tokenName || defaultName,
        tokenSymbol: tokenSymbol || defaultSymbol,
        totalSupply: totalSupply || totalValue,
        pricePerToken: pricePerToken || 1,
        exposure,
      }, token, walletAddress);
      toast.success("Contract tokenized! Tokens are being listed on the marketplace.");
      setStep("success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Tokenization failed";
      setError(msg);
      toast.error(msg);
      setStep("confirm");
    }
  };

  // ── Success step ──────────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <PageHeader
          title="Contract Tokenized!"
          description="Your contract has been tokenized on Arbitrum"
          backHref={`/contracts/${id}`}
          backLabel="Back to Contract"
        />
        <SectionCard className="mb-6">
          <div className="flex flex-col items-center py-10 gap-4">
            <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground mb-1">
                {tokenName || defaultName} ({tokenSymbol || defaultSymbol})
              </p>
              <p className="text-sm text-muted">
                {totalSupply.toLocaleString()} tokens are now live on Arbitrum
              </p>
            </div>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-accent text-accent-foreground text-sm font-semibold shadow-sm shadow-accent/20 hover:opacity-90 active:scale-[0.98] transition-all mt-2"
            >
              View on Marketplace <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </SectionCard>
      </div>
    );
  }

  // ── Broadcasting step ─────────────────────────────────────────────────────
  if (step === "broadcasting") {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <PageHeader
          title="Tokenize Contract"
          description="Minting tokens on Arbitrum..."
          backHref={`/contracts/${id}`}
          backLabel="Back to Contract"
        />
        <SectionCard className="mb-6">
          <div className="flex flex-col items-center py-12 gap-4">
            <Loader2 className="h-12 w-12 text-accent animate-spin" />
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground mb-1">Minting tokens on Arbitrum...</p>
              <p className="text-xs text-muted">Deploying token contract and listing on marketplace. This may take 30-60 seconds.</p>
            </div>
          </div>
        </SectionCard>
      </div>
    );
  }

  // ── Confirmation step ─────────────────────────────────────────────────────
  if (step === "confirm") {
    const resolvedName = tokenName || defaultName;
    const resolvedSymbol = tokenSymbol || defaultSymbol;

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <PageHeader
          title="Review Before Tokenizing"
          description="Confirm your token details before listing on the marketplace"
          backHref={`/contracts/${id}`}
          backLabel="Back to Contract"
        />

        <SectionCard
          title="Token Economics"
          icon={<Coins className="h-5 w-5 text-brand" />}
          className="mb-6"
        >
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-surface-secondary text-center">
              <p className="text-lg font-bold">${totalValue.toLocaleString()}</p>
              <p className="text-xs text-muted">Contract Value</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-secondary text-center">
              <p className="text-lg font-bold text-accent">${investorCost.toLocaleString()}</p>
              <p className="text-xs text-muted">You Receive Upfront</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-secondary text-center">
              <p className="text-lg font-bold text-success">+{investorYieldPct.toFixed(1)}%</p>
              <p className="text-xs text-muted">Investor Yield</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted">Token</span>
              <span className="text-sm font-semibold text-foreground">{resolvedName} ({resolvedSymbol})</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted">Supply</span>
              <span className="text-sm font-semibold text-foreground">{totalSupply.toLocaleString()} tokens</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted">Price per token</span>
              <span className="text-sm font-semibold text-foreground">${pricePerToken.toFixed(2)} <span className="text-xs text-muted">(face $1.00)</span></span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted">Discount</span>
              <span className="text-sm font-semibold text-accent">{discountPct}%</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted">Tokens to mint</span>
              <span className="text-sm font-semibold text-foreground">{totalSupply.toLocaleString()}</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Investor Visibility"
          icon={<Eye className="h-5 w-5 text-brand" />}
          className="mb-6"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {exposure.showDescription ? (
                <CheckCircle className="h-4 w-4 text-success shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-muted shrink-0" />
              )}
              <span className={exposure.showDescription ? "text-foreground" : "text-muted"}>
                Description {exposure.showDescription ? "shown" : "hidden"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {exposure.showMilestones ? (
                <CheckCircle className="h-4 w-4 text-success shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-muted shrink-0" />
              )}
              <span className={exposure.showMilestones ? "text-foreground" : "text-muted"}>
                Milestones {exposure.showMilestones ? "shown" : "hidden"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {exposure.showDisputeHistory ? (
                <CheckCircle className="h-4 w-4 text-success shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-muted shrink-0" />
              )}
              <span className={exposure.showDisputeHistory ? "text-foreground" : "text-muted"}>
                Dispute history {exposure.showDisputeHistory ? "shown" : "hidden"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm mt-1 pt-2 border-t border-border/50">
              <ShieldCheck className="h-4 w-4 text-success shrink-0" />
              <span className="text-muted">Client identity is never exposed</span>
            </div>
          </div>
        </SectionCard>

        <div className="p-4 rounded-xl border border-warning/30 bg-warning/5 mb-6">
          <p className="text-sm text-muted">
            This action mints tokens on Arbitrum and lists them on the marketplace for investors to purchase.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-lg bg-danger/10 border border-danger/20">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onPress={() => setStep("form")}
            variant="ghost"
            className="flex-1 py-3 rounded-xl border border-border text-foreground font-medium"
          >
            Cancel
          </Button>
          <Button
            onPress={handleConfirmTokenize}
            fullWidth
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-brand to-accent text-foreground font-medium hover:opacity-90 transition-opacity"
          >
            Confirm &amp; Tokenize
          </Button>
        </div>
      </div>
    );
  }

  // ── Form step (default) ───────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <PageHeader
        title="Tokenize Contract"
        description="Create tradeable tokens representing your contract receivable and list them on the marketplace"
        backHref={`/contracts/${id}`}
        backLabel="Back to Contract"
      />

      {/* Contract Value Overview */}
      <SectionCard
        title="Contract Value"
        icon={<Coins className="h-5 w-5 text-brand" />}
        className="mb-6"
      >
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-surface-secondary text-center">
            <p className="text-2xl font-bold text-foreground">${totalValue.toLocaleString()}</p>
            <p className="text-xs text-muted mt-1">Contract Value</p>
          </div>
          <div className="p-4 rounded-xl bg-surface-secondary text-center">
            <p className="text-2xl font-bold text-accent">${investorCost.toLocaleString()}</p>
            <p className="text-xs text-muted mt-1">Investor Pays</p>
          </div>
          <div className="p-4 rounded-xl bg-surface-secondary text-center">
            <p className="text-2xl font-bold text-success">+{investorYieldPct.toFixed(1)}%</p>
            <p className="text-xs text-muted mt-1">Investor Yield</p>
          </div>
        </div>

        {/* Discount slider */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-foreground">Investor Discount</label>
            <span className="text-sm font-bold text-accent">{discountPct}%</span>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            value={discountPct}
            onChange={(e) => setDiscountPct(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-surface-tertiary accent-accent"
          />
          <div className="flex justify-between text-xs text-muted mt-1">
            <span>1% (low yield)</span>
            <span>50% (high yield)</span>
          </div>
          <p className="text-xs text-muted mt-3">
            Investors buy tokens at <strong>${pricePerToken.toFixed(2)}</strong> per token (face value $1.00).
            When milestones complete, they redeem at full value — earning <strong>{investorYieldPct.toFixed(1)}%</strong> yield.
            You receive <strong>${investorCost.toLocaleString()}</strong> upfront.
          </p>
        </div>

        {/* Token details */}
        <div className="border-t border-border/50 pt-4">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Token Details</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted mb-1 block">Token Name</label>
              <Input
                type="text"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                placeholder={defaultName}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Token Symbol</label>
              <Input
                type="text"
                value={tokenSymbol}
                onChange={(e) => setTokenSymbol(e.target.value)}
                placeholder={defaultSymbol}
                className="w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
            <div className="p-2 rounded-lg bg-surface-secondary">
              <span className="text-muted">Supply</span>
              <p className="font-mono font-bold">{totalSupply.toLocaleString()}</p>
            </div>
            <div className="p-2 rounded-lg bg-surface-secondary">
              <span className="text-muted">Price</span>
              <p className="font-mono font-bold">${pricePerToken.toFixed(2)}</p>
            </div>
            <div className="p-2 rounded-lg bg-surface-secondary">
              <span className="text-muted">Face Value</span>
              <p className="font-mono font-bold">$1.00</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Investor Visibility */}
      <SectionCard
        title="Investor Visibility"
        icon={<Eye className="h-5 w-5 text-brand" />}
        className="mb-6"
      >
        <p className="text-sm text-muted mb-4">
          Control what information investors can see on the marketplace. Title and progress are always visible.
        </p>

        <div className="space-y-3">
          {([
            { key: "showDescription" as const, label: "Contract Description", desc: "Show the full contract description" },
            { key: "showMilestones" as const, label: "Milestones", desc: "Show individual milestone names, amounts, and deadlines" },
            { key: "showDisputeHistory" as const, label: "Dispute History", desc: "Show past disputes and their resolutions" },
          ]).map(({ key, label, desc }) => (
            <button
              key={key}
              type="button"
              onClick={() => setExposure((prev) => ({ ...prev, [key]: !prev[key] }))}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:border-accent/30 transition-colors text-left"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted">{desc}</p>
              </div>
              <div className={`w-10 h-6 rounded-full flex items-center transition-colors ${exposure[key] ? "bg-accent" : "bg-surface-tertiary"}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform mx-1 ${exposure[key] ? "translate-x-4" : "translate-x-0"}`} />
              </div>
            </button>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-lg bg-success/10 border border-success/20 flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
          <p className="text-xs text-success">Client identity is never exposed to investors.</p>
        </div>
      </SectionCard>

      {/* Summary */}
      <SectionCard title="What happens next" className="mb-6">
        <ol className="space-y-3 text-sm text-muted">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 h-6 w-6 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-bold">1</span>
            <span>Tokens minted on Arbitrum (~30-60 seconds)</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 h-6 w-6 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-bold">2</span>
            <span>Listed on marketplace for investors to purchase</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 h-6 w-6 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-bold">3</span>
            <span>Investors redeem tokens when milestones are approved</span>
          </li>
        </ol>
      </SectionCard>

      <Button
        onPress={handleReviewClick}
        isDisabled={contractLoading}
        fullWidth
        className="py-4 rounded-xl bg-gradient-to-r from-brand to-accent text-foreground font-medium text-lg hover:opacity-90 transition-opacity"
      >
        Review &amp; Tokenize
      </Button>
    </div>
  );
}
