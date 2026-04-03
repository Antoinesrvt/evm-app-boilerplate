import type { InvestorHolding } from "@/lib/types";
import { getDb } from "./client";
import { investorHoldings as holdingsTable } from "./schema";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowToHolding(row: typeof holdingsTable.$inferSelect): InvestorHolding {
  return {
    tokenAddress: row.tokenAddress,
    contractId: row.contractId,
    amount: row.amount,
    buyPrice: row.buyPrice,
    currentPrice: row.currentPrice,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function create(
  investorAddress: string,
  data: InvestorHolding,
): Promise<InvestorHolding> {
  await getDb().insert(holdingsTable).values({
    investorAddress,
    tokenAddress: data.tokenAddress,
    contractId: data.contractId,
    amount: data.amount,
    buyPrice: data.buyPrice,
    currentPrice: data.currentPrice,
  });

  return data;
}

export async function findByInvestor(investorAddress: string): Promise<InvestorHolding[]> {
  const rows = await getDb()
    .select()
    .from(holdingsTable)
    .where(eq(holdingsTable.investorAddress, investorAddress));
  return rows.map(rowToHolding);
}

export async function findByToken(tokenAddress: string): Promise<InvestorHolding[]> {
  const rows = await getDb()
    .select()
    .from(holdingsTable)
    .where(eq(holdingsTable.tokenAddress, tokenAddress));
  return rows.map(rowToHolding);
}
