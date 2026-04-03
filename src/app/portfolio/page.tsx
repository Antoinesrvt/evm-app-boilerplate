"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Wallet, PieChart, Activity, ArrowRight, AlertTriangle } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { Card, CardContent, Spinner, Button } from "@heroui/react";
import { motion } from "framer-motion";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { LabeledProgress } from "@/components/ui/labeled-progress";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ApiHolding {
  contractId: string;
  tokenAddress: string;
  amount: number;
  buyPrice: number;
  currentPrice: number;
  title: string;
  agency: string;
  status: string;
  milestones: Array<{ status: string }>;
  totalValue: number;
}

type Holding = {
  id: string;
  title: string;
  agency: string;
  tokens: number;
  buyPrice: number;
  faceValue: number;
  currentPrice: number;
  progress: number;
  yieldPct: number;
  status: string;
  isDisputed: boolean;
};

// ─── Animation ────────────────────────────────────────────────────────────────
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 200, damping: 22 } } };

// ─── Component ────────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const { getAuthToken, walletAddress } = useAuth();
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const { data: apiHoldings, loading } = useApi<ApiHolding[]>(
    walletAddress ? `/api/users/${walletAddress}/holdings` : null,
  );

  const holdings = useMemo<Holding[]>(() => {
    if (!apiHoldings?.length) return [];
    return apiHoldings.map((h) => {
      const approved = h.milestones?.filter((m) => m.status === "approved").length ?? 0;
      const total    = h.milestones?.length ?? 1;
      const progress = Math.round((approved / total) * 100);
      const faceValue  = h.totalValue / 100; // face value per token
      const yieldPct   = h.buyPrice > 0 ? ((faceValue - h.buyPrice) / h.buyPrice) * 100 : 0;
      return {
        id: h.contractId,
        title: h.title,
        agency: h.agency,
        tokens: h.amount,
        buyPrice: h.buyPrice,
        faceValue,
        currentPrice: h.currentPrice,
        progress,
        yieldPct,
        status: h.status,
        isDisputed: h.status === "disputed",
      };
    });
  }, [apiHoldings]);

  // ─── Summary stats ─────────────────────────────────────────────────────────
  const totalInvested    = holdings.reduce((s, h) => s + h.tokens * h.buyPrice, 0);
  const totalCurrentVal  = holdings.reduce((s, h) => s + h.tokens * h.currentPrice, 0);
  const totalPnL         = totalCurrentVal - totalInvested;
  const totalPnLPct      = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
  const activePositions  = holdings.filter((h) => h.status === "active").length;

  const statsCards = [
    { label: "Portfolio Value",  value: formatCurrency(Math.round(totalCurrentVal)), icon: <Wallet className="h-5 w-5" />,   color: undefined as "success" | "danger" | "warning" | "accent" | undefined },
    { label: "Total Invested",   value: formatCurrency(Math.round(totalInvested)),   icon: <PieChart className="h-5 w-5" />, color: undefined as "success" | "danger" | "warning" | "accent" | undefined },
    { label: "Unrealised P&L",   value: `${totalPnL >= 0 ? "+" : ""}${formatCurrency(Math.round(totalPnL))} (${formatPercent(totalPnLPct, 1)})`, icon: totalPnL >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />, color: (totalPnL >= 0 ? "success" : "danger") as "success" | "danger" },
    { label: "Active Positions", value: String(activePositions),                     icon: <Activity className="h-5 w-5" />, color: "accent" as const },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Portfolio</h1>
          <p className="text-muted text-sm">Your tokenised contract positions and performance.</p>
        </div>
        <Link
          href="/marketplace"
          className="shrink-0 inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-accent text-accent-foreground text-sm font-semibold shadow-sm shadow-accent/20 hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Explore <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-20">
          <Spinner size="lg" className="text-accent" />
        </div>
      )}

      {!loading && (
        <>
          {holdings.length === 0 ? (
            <EmptyState
              icon={<Wallet className="h-12 w-12" />}
              title="No investments yet"
              description="Start earning yield by investing in verified contracts."
              action={
                <Link
                  href="/marketplace"
                  className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-accent text-accent-foreground font-medium shadow-sm active:scale-[0.98] transition-all"
                >
                  Browse Marketplace <ArrowRight className="h-4 w-4" />
                </Link>
              }
            />
          ) : (
            <motion.div initial="hidden" animate="show" variants={container} className="space-y-6">

              {/* Stats row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {statsCards.map((s) => (
                  <motion.div key={s.label} variants={item}>
                    <StatCard value={s.value} label={s.label} icon={s.icon} color={s.color} />
                  </motion.div>
                ))}
              </div>

              {/* Holdings */}
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted mb-3">Holdings</h2>
                <div className="space-y-3">
                  {holdings.map((h) => {
                    const pnl    = (h.currentPrice - h.buyPrice) * h.tokens;
                    const pnlPct = h.buyPrice > 0 ? ((h.currentPrice - h.buyPrice) / h.buyPrice) * 100 : 0;
                    const isUp   = pnl >= 0;

                    return (
                      <motion.div key={h.id} variants={item}>
                        <Card className="border border-border bg-surface rounded-xl shadow-sm hover:border-accent/30 transition-colors">
                          <CardContent className="p-4 sm:p-5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                              {/* Left: title + agency */}
                              <div className="min-w-0 flex-1">
                                <Link
                                  href={`/contracts/${h.id}`}
                                  className="font-semibold text-sm text-foreground hover:text-accent transition-colors line-clamp-1"
                                >
                                  {h.title}
                                </Link>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="text-xs text-muted">{h.agency}</span>
                                  <StatusBadge status={h.status as "active" | "completed"} />
                                </div>
                              </div>

                              {/* Middle: tokens + prices */}
                              <div className="flex items-center gap-6 text-right shrink-0">
                                <div>
                                  <div className="text-xs text-muted font-medium">Tokens</div>
                                  <div className="text-sm font-bold tabular-nums">{h.tokens.toLocaleString()}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted font-medium">Buy / Now</div>
                                  <div className="text-sm font-bold tabular-nums">
                                    ${h.buyPrice.toFixed(2)} / ${h.currentPrice.toFixed(2)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted font-medium">P&L</div>
                                  <div className={`text-sm font-bold tabular-nums ${isUp ? "text-success" : "text-danger"}`}>
                                    {isUp ? "+" : ""}{formatCurrency(Math.round(pnl))}
                                    <span className="text-xs font-normal ml-1">({isUp ? "+" : ""}{formatPercent(pnlPct, 1)})</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Progress */}
                            <div className="mt-4">
                              <LabeledProgress
                                label="Contract progress"
                                value={h.progress}
                                color={h.progress === 100 ? "success" : "accent"}
                              />
                            </div>

                            {/* Dispute warning */}
                            {h.isDisputed && (
                              <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-warning/10 border border-warning/20">
                                <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                                <span className="text-xs text-warning font-medium">
                                  Active dispute — contract under review
                                </span>
                              </div>
                            )}

                            {/* Footer */}
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
                              <span className="text-xs text-muted">
                                Expected yield:{" "}
                                <span className="font-bold text-foreground">
                                  {formatPercent(h.yieldPct, 1)}
                                </span>
                              </span>
                              <div className="flex items-center gap-3">
                                <Button
                                  size="sm"
                                  className="bg-accent text-accent-foreground"
                                  isDisabled={h.isDisputed || redeemingId !== null}
                                  onPress={async () => {
                                    setRedeemingId(h.id);
                                    try {
                                      const token = await getAuthToken();
                                      const res = await fetch("/api/portfolio/redeem", {
                                        method: "POST",
                                        headers: {
                                          "Content-Type": "application/json",
                                          ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                        },
                                        body: JSON.stringify({
                                          contractId: h.id,
                                          tokenAmount: h.tokens,
                                          escrowAddress: "",
                                        }),
                                      });
                                      const result = await res.json();
                                      if (!res.ok) throw new Error(result.error);
                                      toast.success(`Redeemed ${h.tokens} tokens`);
                                    } catch (err) {
                                      toast.error(err instanceof Error ? err.message : "Redemption failed");
                                    } finally {
                                      setRedeemingId(null);
                                    }
                                  }}
                                >
                                  {redeemingId === h.id ? "Redeeming..." : "Redeem Tokens"}
                                </Button>
                                <Link
                                  href={`/marketplace/${h.id}`}
                                  className="text-xs font-semibold text-accent hover:underline"
                                >
                                  View on Marketplace →
                                </Link>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
