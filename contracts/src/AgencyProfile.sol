// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title AgencyProfile
/// @notice On-chain reputation registry for agencies on the Rayls Public Chain.
///         The platform admin records contract outcomes and dispute results;
///         a deterministic weighted score and tier are computed on-chain.
contract AgencyProfile {

    // ── Custom Errors ────────────────────────────────────────────────────

    error NotOwner();
    error ZeroAddress();

    // ── Types ────────────────────────────────────────────────────────────

    struct Profile {
        uint256 contractsCompleted;
        uint256 contractsFailed;
        uint256 disputesWon;
        uint256 disputesLost;
        uint256 totalVolume;          // total USD value of completed contracts
        uint256 totalAiScore;         // sum of AI scores (avg = totalAiScore / completed)
        uint256 streak;               // consecutive completions without disputes
        bool verified;                // KYC verified flag
        bytes32[] attestationHashes;  // legal doc attestation hashes
    }

    // ── State ────────────────────────────────────────────────────────────

    mapping(address => Profile) internal _profiles;
    address public owner;

    // ── Events ───────────────────────────────────────────────────────────

    event ContractCompleted(address indexed agency, uint256 contractValue, uint256 newScore);
    event ContractFailed(address indexed agency, uint256 newScore);
    event DisputeResult(address indexed agency, bool won, uint256 newScore);
    event Verified(address indexed agency, bool status);
    event AttestationAdded(address indexed agency, bytes32 hash);

    // ── Modifiers ────────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ── Constructor ──────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ── Mutators (owner only) ────────────────────────────────────────────

    /// @notice Record a successfully completed contract.
    function recordCompletion(address agency, uint256 contractValue, uint256 aiScore) external onlyOwner {
        if (agency == address(0)) revert ZeroAddress();

        Profile storage p = _profiles[agency];
        p.contractsCompleted++;
        p.totalVolume += contractValue;
        p.totalAiScore += aiScore;
        p.streak++;

        emit ContractCompleted(agency, contractValue, getScore(agency));
    }

    /// @notice Record a failed contract.
    function recordFailure(address agency) external onlyOwner {
        if (agency == address(0)) revert ZeroAddress();

        Profile storage p = _profiles[agency];
        p.contractsFailed++;
        p.streak = 0;

        emit ContractFailed(agency, getScore(agency));
    }

    /// @notice Record a dispute outcome.
    function recordDisputeResult(address agency, bool won) external onlyOwner {
        if (agency == address(0)) revert ZeroAddress();

        Profile storage p = _profiles[agency];
        if (won) {
            p.disputesWon++;
        } else {
            p.disputesLost++;
        }

        emit DisputeResult(agency, won, getScore(agency));
    }

    /// @notice Set KYC verification status.
    function setVerified(address agency, bool status) external onlyOwner {
        if (agency == address(0)) revert ZeroAddress();

        _profiles[agency].verified = status;

        emit Verified(agency, status);
    }

    /// @notice Add a legal document attestation hash.
    function addAttestation(address agency, bytes32 hash) external onlyOwner {
        if (agency == address(0)) revert ZeroAddress();

        _profiles[agency].attestationHashes.push(hash);

        emit AttestationAdded(agency, hash);
    }

    // ── View ─────────────────────────────────────────────────────────────

    /// @notice Return the full profile for an agency.
    function getProfile(address agency) external view returns (Profile memory) {
        return _profiles[agency];
    }

    /// @notice Compute a weighted reputation score (0-100).
    /// @dev    completionRate * 40% + disputeRate * 30% + avgAiScore * 30%
    ///         Returns 50 for agencies with no history.
    function getScore(address agency) public view returns (uint256) {
        Profile storage p = _profiles[agency];

        uint256 totalContracts = p.contractsCompleted + p.contractsFailed;
        if (totalContracts == 0) return 50; // default for new agencies

        // Completion rate (0-100)
        uint256 completionRate = (p.contractsCompleted * 100) / totalContracts;

        // Dispute win rate (0-100), default 50 if no disputes
        uint256 disputeRate;
        uint256 totalDisputes = p.disputesWon + p.disputesLost;
        if (totalDisputes == 0) {
            disputeRate = 50;
        } else {
            disputeRate = (p.disputesWon * 100) / totalDisputes;
        }

        // Average AI score (0-100), default 50 if no completions
        uint256 avgAiScore;
        if (p.contractsCompleted == 0) {
            avgAiScore = 50;
        } else {
            avgAiScore = p.totalAiScore / p.contractsCompleted;
        }

        // Weighted: 40% completion + 30% dispute + 30% AI
        return (completionRate * 40 + disputeRate * 30 + avgAiScore * 30) / 100;
    }

    /// @notice Return a human-readable tier based on the score.
    function getTier(address agency) external view returns (string memory) {
        uint256 score = getScore(agency);

        if (score >= 96) return "Elite";
        if (score >= 81) return "Diamond";
        if (score >= 61) return "Established";
        if (score >= 31) return "Growing";
        return "Seedling";
    }
}
