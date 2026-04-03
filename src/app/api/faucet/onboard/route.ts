// Faucet onboarding is not available in the v2 single-chain architecture.
// This endpoint is kept as a stub to avoid 404 errors from any existing clients.
export async function POST() {
  return Response.json(
    { error: "Faucet onboarding is not available" },
    { status: 410 },
  );
}
