import { type NextRequest } from "next/server";
import { z } from "zod";
import { db, ensureInit } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { redeemTokens, isBlockchainConfigured } from "@/lib/blockchain";

const RedeemSchema = z.object({
  contractId: z.string().min(1),
  tokenAmount: z.number().positive(),
  escrowAddress: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    await ensureInit();
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const parsed = RedeemSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { contractId, tokenAmount, escrowAddress } = parsed.data;

    let txHash: string | undefined;

    if (isBlockchainConfigured()) {
      const tokenAmountWei = BigInt(Math.round(tokenAmount * 1e18));
      txHash = await redeemTokens(escrowAddress, tokenAmountWei);
    }

    return Response.json({
      success: true,
      contractId,
      tokenAmount,
      ...(txHash && { txHash }),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
