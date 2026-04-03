import { db, ensureInit } from "@/lib/db";
import type { OracleAttestation } from "@/lib/types";

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// Auth: public — attestation history is transparent
export async function GET(request: Request) {
  try {
    await ensureInit();
    const { searchParams } = new URL(request.url);
    const agency = searchParams.get("agency");

    if (!agency || !/^0x[a-fA-F0-9]{40}$/i.test(agency)) {
      return Response.json({ error: "Invalid agency address" }, { status: 400 });
    }

    let source: "chain" | "db" = "db";
    const results: OracleAttestation[] = [];

    // Try on-chain first
    try {
      const tokenAddresses = await discoverTokensForAgency(agency);
      if (tokenAddresses.length > 0) {
        const onChainRecords = await getOnChainAttestationsForTokens(tokenAddresses);
        source = "chain";
        results.push(
          ...onChainRecords.map((record) => ({
            id: `chain-${record.tokenAddress}-${record.timestamp}`,
            contractId: record.tokenAddress,
            contractTitle: `Contract ${truncateAddress(record.tokenAddress)}`,
            milestoneId: 0,
            milestoneName: "On-chain attestation",
            approved: record.approved,
            reason: record.reason,
            score: record.score,
            createdAt: new Date(record.timestamp * 1000).toISOString(),
            txHash: record.txHash,
            source: "chain" as const,
          })),
        );
      }
    } catch {
      // Chain unavailable — fall through to DB
    }

    // Fall back to DB if no on-chain data
    if (results.length === 0) {
      const contracts = await db.contracts.findByUser(agency.toLowerCase());
      const agencyContracts = contracts.filter(
        (c) => c.agency?.toLowerCase() === agency.toLowerCase(),
      );

      for (const c of agencyContracts) {
        for (const m of c.milestones) {
          if (m.status === "approved") {
            results.push({
              id: `db-${c.id}-${m.id}`,
              contractId: c.id,
              contractTitle: c.title,
              milestoneId: m.id,
              milestoneName: m.name,
              approved: true,
              reason: `Milestone approved`,
              score: 100,
              createdAt: (m.approvedAt ?? m.deliveredAt ?? c.createdAt).toISOString(),
              txHash: null,
              source: "db" as const,
            });
          }
        }
      }
    }

    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return Response.json({ entries: results, source });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
