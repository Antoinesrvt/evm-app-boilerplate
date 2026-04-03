import { db, ensureInit } from "@/lib/db";
import { discoverAgencies, getAgencyProfile, getAgencyScore } from "@/lib/blockchain/agency-profile";
import type { LeaderboardEntry } from "@/lib/types";

function computeTier(score: number): string {
  if (score >= 96) return "Elite";
  if (score >= 81) return "Diamond";
  if (score >= 61) return "Established";
  if (score >= 31) return "Growing";
  return "Seedling";
}

// Auth: public — leaderboard is open to everyone
export async function GET(request: Request) {
  try {
    await ensureInit();
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort") ?? "score";
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "10", 10) || 10, 1), 50);

    // Try on-chain first, fall back to DB
    let source: "chain" | "db" = "db";
    const entries: LeaderboardEntry[] = [];

    // Try on-chain discovery
    try {
      const addresses = await discoverAgencies();
      if (addresses.length > 0) {
        source = "chain";
        const results = await Promise.all(
          addresses.map(async (addr) => {
            const [profile, score] = await Promise.all([
              getAgencyProfile(addr).catch(() => null),
              getAgencyScore(addr).catch(() => 0),
            ]);
            let name: string | null = null;
            try {
              const user = await db.users.findByAddress(addr);
              name = user?.name ?? null;
            } catch {}
            return {
              address: addr,
              name,
              score,
              tier: computeTier(score),
              contractsCompleted: profile?.contractsCompleted ?? 0,
              totalVolume: profile?.totalVolume ?? 0,
              verified: profile?.verified ?? false,
              source: "chain" as const,
            };
          }),
        );
        entries.push(...results);
      }
    } catch {
      // Chain unavailable — fall through to DB
    }

    // If no on-chain data, build from DB
    if (entries.length === 0) {
      const allUsers = await db.users.listAgencies();

      for (const user of allUsers) {
        const contracts = await db.contracts.findByUser(user.address);
        const agencyContracts = contracts.filter(c => c.agency?.toLowerCase() === user.address.toLowerCase());
        const completed = agencyContracts.filter(c => c.status === "completed").length;
        const totalVolume = agencyContracts.reduce((sum, c) => sum + c.totalValue, 0);
        const completionRate = agencyContracts.length > 0
          ? Math.round((completed / agencyContracts.length) * 100)
          : 0;
        const score = completionRate;

        entries.push({
          address: user.address,
          name: user.name ?? null,
          score,
          tier: computeTier(score),
          contractsCompleted: completed,
          totalVolume,
          verified: user.agencyProfile?.verified ?? false,
          source: "db",
        });
      }
    }

    // Sort
    if (sort === "volume") {
      entries.sort((a, b) => b.totalVolume - a.totalVolume);
    } else {
      entries.sort((a, b) => b.score - a.score);
    }

    return Response.json({ entries: entries.slice(0, limit), source });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
