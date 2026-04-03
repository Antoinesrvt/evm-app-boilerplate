"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  Chip,
  Spinner,
  Button,
  Input,
} from "@heroui/react";
import {
  Search,
  Shield,
  ShieldCheck,
  TrendingUp,
  Trophy,
  Flame,
  CheckCircle2,
  XCircle,
  ExternalLink,
  BarChart3,
  Link2,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  PageHeader,
  SectionCard,
  StatCard,
  ScoreBadge,
  StatusBadge,
  LabeledProgress,
  EmptyState,
} from "@/components/ui";
import {
  useOracleProfile,
  useOracleLeaderboard,
  useOracleAttestations,
} from "@/hooks/use-oracle";
import { useAuth } from "@/hooks/use-auth";

/* ------------------------------------------------------------------ */
/*  Constants & helpers                                                */
/* ------------------------------------------------------------------ */

function SourceBadge() {
  return (
    <Chip size="sm" variant="soft" color="success" className="text-xs gap-1">
      <Link2 className="h-3 w-3" /> On-chain data
    </Chip>
  );
}

interface TierInfo {
  name: string;
  icon: string;
  color: "warning" | "accent" | "success" | "default";
}

function getTier(score: number): TierInfo {
  if (score >= 96) return { name: "Elite", icon: "\ud83d\udc51", color: "warning" };
  if (score >= 81) return { name: "Diamond", icon: "\ud83d\udc8e", color: "accent" };
  if (score >= 61) return { name: "Established", icon: "\ud83c\udf33", color: "success" };
  if (score >= 31) return { name: "Growing", icon: "\ud83c\udf3f", color: "success" };
  return { name: "Seedling", icon: "\ud83c\udf31", color: "default" };
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 220, damping: 22 } },
};

/* ------------------------------------------------------------------ */
/*  Score Ring (reused from profile/page.tsx)                          */
/* ------------------------------------------------------------------ */

function ScoreRing({ score, size = 120, initials = "?" }: { score: number; size?: number; initials?: string }) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        aria-label={`Score: ${score} out of 100`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#oracleScoreGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
        <defs>
          <linearGradient id="oracleScoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--accent))" />
            <stop offset="100%" stopColor="hsl(var(--success))" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[calc(100%-20px)] h-[calc(100%-20px)] rounded-full bg-surface-secondary flex items-center justify-center">
          <span className="text-2xl font-bold text-foreground">{initials}</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Leaderboard rank badge                                             */
/* ------------------------------------------------------------------ */

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg" title="1st">&#x1F947;</span>;
  if (rank === 2) return <span className="text-lg" title="2nd">&#x1F948;</span>;
  if (rank === 3) return <span className="text-lg" title="3rd">&#x1F949;</span>;
  return <span className="text-sm font-bold text-muted w-7 text-center">#{rank}</span>;
}

/* ------------------------------------------------------------------ */
/*  Main Oracle Page                                                   */
/* ------------------------------------------------------------------ */

export default function OraclePage() {
  const [searchInput, setSearchInput] = useState("");
  const [activeAddress, setActiveAddress] = useState<string | null>(null);
  const [leaderboardSort, setLeaderboardSort] = useState<"score" | "volume">("score");

  const { authenticated } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useOracleProfile(activeAddress);
  const { attestations, loading: attestationsLoading } = useOracleAttestations(activeAddress);
  const { leaderboard, loading: leaderboardLoading } = useOracleLeaderboard(leaderboardSort);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      setActiveAddress(trimmed);
    }
  };

  const handleLeaderboardClick = (address: string) => {
    setSearchInput(address);
    setActiveAddress(address);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const tier = profile ? getTier(profile.score) : null;
  const profileInitials = profile?.name
    ? profile.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : activeAddress
      ? activeAddress.slice(2, 4).toUpperCase()
      : "?";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="text-center mb-10">
        <PageHeader
          title="Trust Oracle"
          description="Verify any agency's on-chain reputation and attestation history"
        />
        <Chip size="sm" variant="soft" color="default" className="mt-3">
          Public &middot; Read Only
        </Chip>
      </div>

      {/* ── Search Bar ───────────────────────────────────────────── */}
      <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-12">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Enter agency address (0x...)"
              className="pl-10"
              aria-label="Agency address"
            />
          </div>
          <Button
            type="submit"
            className="bg-accent text-accent-foreground font-medium px-6"
            isDisabled={!/^0x[a-fA-F0-9]{40}$/.test(searchInput.trim())}
          >
            Scan
          </Button>
        </div>
        {authenticated && !activeAddress && (
          <p className="text-xs text-muted mt-2 text-center">
            <button
              type="button"
              className="text-accent hover:underline"
              onClick={() => {
                // Privy wallet address can be accessed from auth context
              }}
            >
              Or search from the leaderboard below
            </button>
          </p>
        )}
      </form>

      {/* ── Profile Section ──────────────────────────────────────── */}
      {activeAddress && (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="mb-16"
        >
          {profileLoading ? (
            <div className="flex justify-center py-16">
              <Spinner size="lg" className="text-accent" />
            </div>
          ) : profileError ? (
            <Card className="border border-border mb-8">
              <CardContent className="p-8 text-center">
                <XCircle className="h-10 w-10 text-danger mx-auto mb-3" />
                <p className="text-sm text-muted">{profileError}</p>
              </CardContent>
            </Card>
          ) : profile && tier ? (
            <>
              {/* ── Trust Profile Card ────────────────────────── */}
              <motion.div variants={fadeUp}>
                <Card className="border border-border mb-8">
                  <CardContent className="p-8">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                      <ScoreRing score={profile.score} size={120} initials={profileInitials} />

                      <div className="flex-1 text-center sm:text-left">
                        <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                          <h2 className="text-2xl font-bold text-foreground tracking-tight">
                            {profile.name ?? truncateAddress(profile.address)}
                          </h2>
                          <Chip size="sm" color={tier.color} variant="soft" className="font-bold text-xs gap-1">
                            <span>{tier.icon}</span> {tier.name}
                          </Chip>
                        </div>

                        <a
                          href={`https://sepolia.arbiscan.io/address/${profile.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted font-mono mt-1 hover:text-accent flex items-center justify-center sm:justify-start gap-1"
                        >
                          {truncateAddress(profile.address)}
                          <ExternalLink className="h-3 w-3" />
                        </a>

                        <div className="flex items-center justify-center sm:justify-start gap-4 mt-3 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">
                            Score: {profile.score}/100
                          </span>

                          {profile.verified && (
                            <Chip size="sm" color="success" variant="soft" className="text-xs gap-1">
                              <ShieldCheck className="h-3 w-3" /> KYC Verified
                            </Chip>
                          )}

                          <SourceBadge />

                          {profile.onChainScore !== null && (
                            <Chip size="sm" color="accent" variant="soft" className="text-xs gap-1">
                              <Shield className="h-3 w-3" /> On-chain: {profile.onChainScore}
                            </Chip>
                          )}
                        </div>

                        {profile.streak > 0 && (
                          <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-2 text-warning">
                            <Flame className="h-4 w-4" />
                            <span className="text-xs font-semibold">{profile.streak} contract streak</span>
                          </div>
                        )}

                        {profile.memberSince && (
                          <p className="text-xs text-muted mt-2">
                            Member since {new Date(profile.memberSince).toLocaleDateString("en-CA")}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* ── Performance Breakdown ─────────────────────── */}
              <motion.div variants={fadeUp}>
                <SectionCard
                  title="Performance Breakdown"
                  icon={<BarChart3 className="h-4 w-4 text-accent" />}
                  className="mb-6"
                >
                  <div className="space-y-5">
                    <LabeledProgress
                      label="Completion Rate"
                      value={profile.completionRate}
                      color={profile.completionRate >= 80 ? "success" : "warning"}
                    />
                    <LabeledProgress
                      label="Dispute Win Rate"
                      value={profile.disputeWinRate}
                      color={profile.disputeWinRate >= 80 ? "success" : "warning"}
                    />
                  </div>
                </SectionCard>
              </motion.div>

              {/* ── Volume & History Stats ────────────────────── */}
              <motion.div variants={fadeUp}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <StatCard
                    value={formatCurrency(profile.totalVolume)}
                    label="Total Volume"
                    icon={<TrendingUp className="h-4 w-4 text-accent" />}
                  />
                  <StatCard
                    value={profile.contractsCompleted}
                    label="Completed"
                    color="success"
                  />
                  <StatCard
                    value={profile.contractsFailed}
                    label="Failed"
                    color="danger"
                  />
                  <StatCard
                    value={`${profile.disputesWon}W / ${profile.disputesLost}L`}
                    label="Disputes"
                    color="warning"
                  />
                </div>
              </motion.div>

              {/* ── Attestations ──────────────────────────────── */}
              <motion.div variants={fadeUp}>
                <SectionCard
                  title="Attestations"
                  icon={<ShieldCheck className="h-4 w-4 text-accent" />}
                  className="mb-6"
                  action={!attestationsLoading && attestations.length > 0 ? <SourceBadge /> : undefined}
                >
                  {attestationsLoading ? (
                    <div className="flex justify-center py-8">
                      <Spinner size="sm" className="text-accent" />
                    </div>
                  ) : attestations.length === 0 ? (
                    <p className="text-sm text-muted text-center py-8">No attestations yet.</p>
                  ) : (
                    <div className="overflow-x-auto -mx-6 -mb-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/50">
                            <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Contract</th>
                            <th className="text-left px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Milestone</th>
                            <th className="text-center px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Verdict</th>
                            <th className="text-center px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Score</th>
                            <th className="text-right px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {attestations.map((att) => (
                            <tr key={att.id} className="hover:bg-surface-secondary transition-colors">
                              <td className="px-6 py-3 font-medium text-foreground">{att.contractTitle}</td>
                              <td className="px-3 py-3 text-muted">{att.milestoneName}</td>
                              <td className="px-3 py-3 text-center">
                                {att.approved ? (
                                  <Chip size="sm" color="success" variant="soft" className="text-xs gap-1">
                                    <CheckCircle2 className="h-3 w-3" /> Approved
                                  </Chip>
                                ) : (
                                  <Chip size="sm" color="danger" variant="soft" className="text-xs gap-1">
                                    <XCircle className="h-3 w-3" /> Rejected
                                  </Chip>
                                )}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <ScoreBadge score={att.score} />
                              </td>
                              <td className="px-6 py-3 text-right text-muted text-xs">
                                {new Date(att.createdAt).toLocaleDateString("en-CA")}
                                {att.txHash && (
                                  <a
                                    href={`https://sepolia.arbiscan.io/tx/${att.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-1.5 inline-flex items-center text-accent hover:underline"
                                    title="View on Arbiscan"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SectionCard>
              </motion.div>
            </>
          ) : null}
        </motion.div>
      )}

      {/* ── Leaderboard ──────────────────────────────────────────── */}
      <SectionCard
        title="Agency Leaderboard"
        icon={<Trophy className="h-4 w-4 text-warning" />}
        action={
          <div className="flex items-center gap-2">
            {!leaderboardLoading && <SourceBadge />}
            <div className="flex gap-1">
              {(["score", "volume"] as const).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={leaderboardSort === s ? "primary" : "ghost"}
                  className={leaderboardSort === s ? "bg-accent text-accent-foreground" : ""}
                  onPress={() => setLeaderboardSort(s)}
                >
                  By {s === "score" ? "Score" : "Volume"}
                </Button>
              ))}
            </div>
          </div>
        }
      >
        {leaderboardLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="sm" className="text-accent" />
          </div>
        ) : leaderboard.length === 0 ? (
          <EmptyState
            icon={<Trophy className="h-10 w-10" />}
            title="No agencies yet"
            description="The leaderboard will populate as agencies complete contracts."
          />
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="show">
            <div className="overflow-x-auto -mx-6 -mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider w-12">Rank</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Agency</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Tier</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Score</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Volume</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Contracts</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {leaderboard.map((entry, idx) => {
                    const entryTier = getTier(entry.score);
                    return (
                      <motion.tr
                        key={entry.address}
                        variants={fadeUp}
                        className="hover:bg-surface-secondary transition-colors cursor-pointer"
                        onClick={() => handleLeaderboardClick(entry.address)}
                      >
                        <td className="px-4 py-3 text-center">
                          <RankBadge rank={idx + 1} />
                        </td>
                        <td className="px-3 py-3">
                          <div>
                            <span className="font-medium text-foreground">
                              {entry.name ?? truncateAddress(entry.address)}
                            </span>
                            {entry.name && (
                              <a
                                href={`https://sepolia.arbiscan.io/address/${entry.address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-xs text-muted font-mono hover:text-accent"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {truncateAddress(entry.address)}
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Chip size="sm" color={entryTier.color} variant="soft" className="text-xs gap-1">
                            <span>{entryTier.icon}</span> {entryTier.name}
                          </Chip>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <ScoreBadge score={entry.score} />
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-foreground">
                          {formatCurrency(entry.totalVolume)}
                        </td>
                        <td className="px-3 py-3 text-center text-foreground">
                          {entry.contractsCompleted}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {entry.verified ? (
                            <ShieldCheck className="h-4 w-4 text-success mx-auto" />
                          ) : (
                            <Shield className="h-4 w-4 text-muted mx-auto" />
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </SectionCard>
    </div>
  );
}
