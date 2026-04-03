import { db, ensureInit } from "@/lib/db";
import { getAgencyScore, getAgencyProfile, getAgencyTier } from "@/lib/blockchain/agency-profile";
import type { OracleProfile } from "@/lib/types";

function computeTier(score: number): string {
  if (score >= 96) return "Elite";
  if (score >= 81) return "Diamond";
  if (score >= 61) return "Established";
  if (score >= 31) return "Growing";
  return "Seedling";
}

// Auth: public — anyone can verify agency reputation
export async function GET(request: Request) {
  try {
    await ensureInit();
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address || !/^0x[a-fA-F0-9]{40}$/i.test(address)) {
      return Response.json({ error: "Invalid address parameter" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();

    // Try on-chain first, fall back to DB
    let source: "chain" | "db" = "db";
    let onChainScore: number | null = null;
    let onChainProfile: Awaited<ReturnType<typeof getAgencyProfile>> | null = null;
    let onChainTier: string | null = null;

    try {
      [onChainScore, onChainProfile, onChainTier] = await Promise.all([
        getAgencyScore(address),
        getAgencyProfile(address),
        getAgencyTier(address),
      ]);
      if (onChainProfile) source = "chain";
    } catch {
      // On-chain not available — continue with DB
    }

    // Load DB data
    const user = await db.users.findByAddress(normalizedAddress);
    const contracts = await db.contracts.findByUser(normalizedAddress);

    // If neither on-chain nor DB has data, 404
    if (!onChainProfile && !user) {
      return Response.json({ error: "Agency not found" }, { status: 404 });
    }

    // Compute stats from DB contracts
    const agencyContracts = contracts.filter(c => c.agency?.toLowerCase() === normalizedAddress);
    const completed = agencyContracts.filter(c => c.status === "completed").length;
    const failed = agencyContracts.filter(c => c.status === "failed").length;
    const totalVolume = agencyContracts.reduce((sum, c) => sum + c.totalValue, 0);
    // Use on-chain data when available, fall back to DB
    const contractsCompleted = onChainProfile?.contractsCompleted ?? completed;
    const contractsFailed = onChainProfile?.contractsFailed ?? failed;
    const disputesWon = onChainProfile?.disputesWon ?? 0;
    const disputesLost = onChainProfile?.disputesLost ?? 0;
    const totalContracts = contractsCompleted + contractsFailed;
    const totalDisputes = disputesWon + disputesLost;

    const completionRate = totalContracts > 0 ? Math.round((contractsCompleted / totalContracts) * 100) : 0;
    const disputeWinRate = totalDisputes > 0 ? Math.round((disputesWon / totalDisputes) * 100) : 0;

    // Compute score: 60% completion + 40% disputes
    const score = onChainScore ?? Math.round(
      (completionRate * 60 + disputeWinRate * 40) / 100,
    );
    const tier = onChainTier ?? computeTier(score);

    const profile: OracleProfile = {
      address,
      name: user?.name ?? null,
      tier,
      score,
      verified: onChainProfile?.verified ?? (user?.agencyProfile?.verified ?? false),
      streak: onChainProfile?.streak ?? completed,
      contractsCompleted,
      contractsFailed,
      disputesWon,
      disputesLost,
      totalVolume: onChainProfile?.totalVolume ?? totalVolume,
      completionRate,
      disputeWinRate,
      onChainScore: onChainScore ?? null,
      onChainTier: onChainTier ?? null,
      attestations: user?.agencyProfile?.attestations ?? [],
      memberSince: user?.createdAt?.toISOString() ?? null,
      source,
    };

    return Response.json(profile);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
