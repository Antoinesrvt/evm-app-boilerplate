import { type NextRequest } from "next/server";
import { db, ensureInit } from "@/lib/db";

// Auth: public (demo) — add requireAuth() for production
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  try {
    await ensureInit();
    const { address } = await params;
    const holdings = await db.holdings.findByInvestor(address);

    // Enrich each holding with contract details for portfolio display
    const enriched = await Promise.all(
      holdings.map(async (h) => {
        const contract = await db.contracts.findById(h.contractId);
        return {
          ...h,
          title: contract?.title ?? "Unknown Contract",
          agency: contract?.agency ?? "",
          status: contract?.status ?? "unknown",
          milestones: contract?.milestones ?? [],
          totalValue: contract?.totalValue ?? 0,
        };
      }),
    );

    return Response.json(enriched);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
