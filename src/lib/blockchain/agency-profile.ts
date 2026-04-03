import { ethers } from "ethers";
import { getProvider, getDeployerSigner } from "./clients";
import { CHAIN_CONFIG } from "./config";

export interface AgencyChainProfile {
  contractsCompleted: number;
  contractsFailed: number;
  disputesWon: number;
  disputesLost: number;
  totalVolume: number;
  streak: number;
  verified: boolean;
  attestationHashes: string[];
}

export async function recordCompletion(
  agencyAddress: string,
  contractValue: bigint,
  completionScore: number,
): Promise<string> {
  if (!CHAIN_CONFIG.agencyProfileAddress) {
    throw new Error("AGENCY_PROFILE_ADDRESS not configured");
  }
  const signer = getDeployerSigner();
  const contract = new ethers.Contract(CHAIN_CONFIG.agencyProfileAddress, AGENCY_PROFILE_ABI, signer);
  const tx = await contract.recordCompletion(agencyAddress, contractValue, completionScore);
  const receipt = await tx.wait(1);
  return receipt.hash;
}

export async function recordFailure(agencyAddress: string): Promise<string> {
  if (!CHAIN_CONFIG.agencyProfileAddress) throw new Error("AGENCY_PROFILE_ADDRESS not configured");
  const signer = getDeployerSigner();
  const contract = new ethers.Contract(CHAIN_CONFIG.agencyProfileAddress, AGENCY_PROFILE_ABI, signer);
  const tx = await contract.recordFailure(agencyAddress);
  const receipt = await tx.wait(1);
  return receipt.hash;
}

export async function recordDisputeResult(agencyAddress: string, won: boolean): Promise<string> {
  if (!CHAIN_CONFIG.agencyProfileAddress) throw new Error("AGENCY_PROFILE_ADDRESS not configured");
  const signer = getDeployerSigner();
  const contract = new ethers.Contract(CHAIN_CONFIG.agencyProfileAddress, AGENCY_PROFILE_ABI, signer);
  const tx = await contract.recordDisputeResult(agencyAddress, won);
  const receipt = await tx.wait(1);
  return receipt.hash;
}

export async function getAgencyScore(agencyAddress: string): Promise<number> {
  if (!CHAIN_CONFIG.agencyProfileAddress) return 0;
  const provider = getProvider();
  const contract = new ethers.Contract(CHAIN_CONFIG.agencyProfileAddress, AGENCY_PROFILE_ABI, provider);
  const score = await contract.getScore(agencyAddress);
  return Number(score);
}

export async function getAgencyProfile(agencyAddress: string): Promise<AgencyChainProfile | null> {
  if (!CHAIN_CONFIG.agencyProfileAddress) return null;
  const provider = getProvider();
  const contract = new ethers.Contract(CHAIN_CONFIG.agencyProfileAddress, AGENCY_PROFILE_ABI, provider);
  const p = await contract.getProfile(agencyAddress);
  return {
    contractsCompleted: Number(p.contractsCompleted),
    contractsFailed: Number(p.contractsFailed),
    disputesWon: Number(p.disputesWon),
    disputesLost: Number(p.disputesLost),
    totalVolume: Number(ethers.formatUnits(p.totalVolume, 18)),
    streak: Number(p.streak),
    verified: p.verified,
    attestationHashes: [...p.attestationHashes],
  };
}

export async function getAgencyTier(agencyAddress: string): Promise<string | null> {
  if (!CHAIN_CONFIG.agencyProfileAddress) return null;
  const provider = getProvider();
  const contract = new ethers.Contract(CHAIN_CONFIG.agencyProfileAddress, AGENCY_PROFILE_ABI, provider);
  return await contract.getTier(agencyAddress);
}

/**
 * Discover all agency addresses that have on-chain activity by scanning events.
 */
export async function discoverAgencies(): Promise<string[]> {
  if (!CHAIN_CONFIG.agencyProfileAddress) return [];

  const provider = getProvider();
  const iface = new ethers.Interface(AGENCY_PROFILE_ABI);
  const contractAddr = CHAIN_CONFIG.agencyProfileAddress;

  const eventNames = ["ContractCompleted", "ContractFailed", "DisputeResult"];
  const uniqueAddresses = new Set<string>();

  for (const eventName of eventNames) {
    const topic = iface.getEvent(eventName)?.topicHash;
    if (!topic) continue;

    const logs = await provider.getLogs({
      address: contractAddr,
      topics: [topic],
      fromBlock: 0,
      toBlock: "latest",
    });

    for (const log of logs) {
      // agency address is the first indexed param (topic[1])
      if (log.topics[1]) {
        const addr = ethers.getAddress("0x" + log.topics[1].slice(26));
        uniqueAddresses.add(addr);
      }
    }
  }

  return Array.from(uniqueAddresses);
}
