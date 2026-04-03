import { type NextRequest } from "next/server";
import { z } from "zod";
import { db, ensureInit } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { mintTokens, isBlockchainConfigured, listOnMarketplace, CHAIN_CONFIG } from "@/lib/blockchain";
import { DEFAULT_EXPOSURE } from "@/lib/types/contract";

const TokenizeSchema = z.object({
  tokenName: z.string().min(1),
  tokenSymbol: z.string().min(1).max(10),
  totalSupply: z.number().positive(),
  pricePerToken: z.number().positive(),
  exposure: z
    .object({
      showDescription: z.boolean(),
      showMilestones: z.boolean(),
      showDisputeHistory: z.boolean(),
    })
    .optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await ensureInit();
    const { id } = await params;

    // Guard 1: only the agency can tokenize
    const auth = await requireRole(request, id, "agency");
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const parsed = TokenizeSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const contract = await db.contracts.findById(id);
    if (!contract) {
      return Response.json({ error: "Contract not found" }, { status: 404 });
    }

    // Guard 2: escrow must be deposited (contract must be active)
    if (contract.status !== "active") {
      return Response.json(
        { error: "Contract must be active (escrow deposited) before tokenizing" },
        { status: 400 },
      );
    }

    // Guard 3: can't tokenize twice
    if (contract.tokenizationExposure) {
      return Response.json(
        { error: "Contract has already been tokenized" },
        { status: 400 },
      );
    }

    let tokenAddress = contract.tokenAddress || "0x_pending_" + id.slice(0, 8);

    if (isBlockchainConfigured() && contract.tokenAddress) {
      const totalSupplyWei = BigInt(Math.round(parsed.data.totalSupply * 1e18));

      // Mint tokens to agency
      await db.blockchainEvents.tracked(
        { contractId: id, operation: "mint_tokens", chain: "arbitrum", params: { amount: parsed.data.totalSupply } },
        async () => {
          const txHash = await mintTokens(
            contract.tokenAddress!,
            contract.agency,
            totalSupplyWei,
          );
          return { txHash };
        },
      );

      // List on Marketplace
      const marketplaceAddress = process.env.MARKETPLACE_ADDRESS;
      if (marketplaceAddress && contract.tokenAddress) {
        await db.blockchainEvents.tracked(
          { contractId: id, operation: "list_marketplace", chain: "arbitrum", params: { price: parsed.data.pricePerToken } },
          async () => {
            const result = await listOnMarketplace({
              marketplaceAddress,
              tokenAddress: contract.tokenAddress!,
              amount: totalSupplyWei,
              price: BigInt(Math.round(parsed.data.pricePerToken * 1e18)),
            });
            return { txHash: result.txHash };
          },
        );
      }
    }

    // Store exposure settings (default all OFF for privacy)
    const exposure = parsed.data.exposure ?? DEFAULT_EXPOSURE;

    const updated = await db.contracts.update(id, {
      tokenAddress,
      tokenizationExposure: JSON.stringify(exposure),
    });

    const blockchainWarnings = await db.blockchainEvents.getFailedEvents(id);
    return Response.json({
      ...updated,
      ...(blockchainWarnings.length > 0 && { blockchainWarnings }),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
