export type OracleSource = "chain" | "db";

export interface OracleProfile {
  address: string;
  name: string | null;
  tier: string;
  score: number;
  verified: boolean;
  streak: number;
  contractsCompleted: number;
  contractsFailed: number;
  disputesWon: number;
  disputesLost: number;
  totalVolume: number;
  completionRate: number;
  disputeWinRate: number;
  onChainScore: number | null;
  onChainTier: string | null;
  attestations: { label: string; verified: boolean; hash?: string }[];
  memberSince: string | null;
  source: OracleSource;
}

export interface LeaderboardEntry {
  address: string;
  name: string | null;
  score: number;
  tier: string;
  contractsCompleted: number;
  totalVolume: number;
  verified: boolean;
  source: OracleSource;
}

export interface OracleAttestation {
  id: string;
  contractId: string;
  contractTitle: string;
  milestoneId: number;
  milestoneName: string;
  approved: boolean;
  reason: string;
  score: number;
  createdAt: string;
  txHash: string | null;
  source: OracleSource;
}
