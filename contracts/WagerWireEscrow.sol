// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title WagerWireEscrow
 * @notice Base Sepolia USDC escrow for P2P subjective bets.
 *         Funds are locked until GenLayer contract emits a resolution event.
 */
contract WagerWireEscrow is ReentrancyGuard, Ownable {
    IERC20 public usdc;

    enum WagerStatus {
        Pending,
        Funded,
        Resolved,
        Cancelled,
        Disputed
    }

    struct Wager {
        uint256 id;
        address creator;
        address opponent;
        uint256 amount; // USDC amount per player (total = 2 * amount)
        WagerStatus status;
        address winner;
        bytes32 genlayerTxHash; // Reference to GenLayer resolution tx
        uint256 createdAt;
        uint256 resolvedAt;
    }

    mapping(uint256 => Wager) public wagers;
    mapping(uint256 => mapping(address => bool)) public hasFunded;
    mapping(uint256 => uint256) public wagerDeposits;
    uint256 public nextWagerId;
    uint256 public totalLocked;

    // GenLayer contract address authorized to call resolveWager
    address public genlayerResolver;

    event WagerCreated(
        uint256 indexed wagerId,
        address indexed creator,
        address indexed opponent,
        uint256 amount,
        string question,
        string sourceUrl
    );
    event WagerFunded(uint256 indexed wagerId, address indexed funder);
    event WagerResolved(
        uint256 indexed wagerId,
        address indexed winner,
        bytes32 genlayerTxHash
    );
    event WagerCancelled(uint256 indexed wagerId);
    event GenLayerResolverUpdated(address indexed newResolver);

    modifier onlyGenLayerResolver() {
        require(
            msg.sender == genlayerResolver || msg.sender == owner(),
            "Unauthorized resolver"
        );
        _;
    }

    constructor(address _usdc) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
    }

    function setGenLayerResolver(address _resolver) external onlyOwner {
        require(_resolver != address(0), "Invalid resolver");
        genlayerResolver = _resolver;
        emit GenLayerResolverUpdated(_resolver);
    }

    /**
     * @notice Creator initiates a wager on-chain.
     * @param opponent Address of the betting opponent.
     * @param amount USDC amount each player must stake.
     * @param question Subjective bet question (for event metadata).
     * @param sourceUrl URL to be validated by GenLayer.
     */
    function createWager(
        address opponent,
        uint256 amount,
        string calldata question,
        string calldata sourceUrl
    ) external nonReentrant returns (uint256) {
        require(opponent != address(0) && opponent != msg.sender, "Invalid opponent");
        require(amount > 0, "Amount must be > 0");
        require(bytes(question).length > 0, "Question required");
        require(bytes(sourceUrl).length > 0, "Source URL required");

        uint256 wagerId = nextWagerId++;
        wagers[wagerId] = Wager({
            id: wagerId,
            creator: msg.sender,
            opponent: opponent,
            amount: amount,
            status: WagerStatus.Pending,
            winner: address(0),
            genlayerTxHash: bytes32(0),
            createdAt: block.timestamp,
            resolvedAt: 0
        });

        emit WagerCreated(wagerId, msg.sender, opponent, amount, question, sourceUrl);
        return wagerId;
    }

    /**
     * @notice Creator or opponent stakes their USDC into escrow.
     * @param wagerId Wager to fund.
     */
    function fundWager(uint256 wagerId) external nonReentrant {
        Wager storage wager = wagers[wagerId];
        require(
            msg.sender == wager.creator || msg.sender == wager.opponent,
            "Not a participant"
        );
        require(wager.status == WagerStatus.Pending, "Wager not pending");
        require(!hasFunded[wagerId][msg.sender], "Already funded");

        require(
            usdc.transferFrom(msg.sender, address(this), wager.amount),
            "USDC transfer failed"
        );

        hasFunded[wagerId][msg.sender] = true;
        wagerDeposits[wagerId] += wager.amount;
        totalLocked += wager.amount;

        if (hasFunded[wagerId][wager.creator] && hasFunded[wagerId][wager.opponent]) {
            wager.status = WagerStatus.Funded;
        }

        emit WagerFunded(wagerId, msg.sender);
    }

    /**
     * @notice Resolve wager and distribute funds to winner.
     * @param wagerId Wager to resolve.
     * @param winner Address that won the bet.
     * @param genlayerTxHash Reference to GenLayer resolution transaction.
     */
    function resolveWager(
        uint256 wagerId,
        address winner,
        bytes32 genlayerTxHash
    ) external nonReentrant onlyGenLayerResolver {
        Wager storage wager = wagers[wagerId];
        require(wager.status == WagerStatus.Funded, "Wager not funded");
        require(
            winner == wager.creator || winner == wager.opponent,
            "Invalid winner"
        );
        require(genlayerTxHash != bytes32(0), "GenLayer tx required");

        uint256 totalPool = wager.amount * 2;
        require(wagerDeposits[wagerId] >= totalPool, "Wager not fully funded");

        wager.status = WagerStatus.Resolved;
        wager.winner = winner;
        wager.genlayerTxHash = genlayerTxHash;
        wager.resolvedAt = block.timestamp;

        totalLocked -= totalPool;
        wagerDeposits[wagerId] = 0;

        require(usdc.transfer(winner, totalPool), "Payout failed");

        emit WagerResolved(wagerId, winner, genlayerTxHash);
    }

    /**
     * @notice Cancel a pending wager and refund any deposited funds.
     * @param wagerId Wager to cancel.
     */
    function cancelWager(uint256 wagerId) external nonReentrant {
        Wager storage wager = wagers[wagerId];
        require(
            msg.sender == wager.creator || msg.sender == owner(),
            "Unauthorized"
        );
        require(
            wager.status == WagerStatus.Pending || wager.status == WagerStatus.Funded,
            "Cannot cancel"
        );

        uint256 deposits = wagerDeposits[wagerId];
        if (deposits > 0) {
            if (hasFunded[wagerId][wager.creator]) {
                require(usdc.transfer(wager.creator, wager.amount), "Creator refund failed");
                hasFunded[wagerId][wager.creator] = false;
            }
            if (hasFunded[wagerId][wager.opponent]) {
                require(usdc.transfer(wager.opponent, wager.amount), "Opponent refund failed");
                hasFunded[wagerId][wager.opponent] = false;
            }
            totalLocked -= deposits;
            wagerDeposits[wagerId] = 0;
        }

        wager.status = WagerStatus.Cancelled;
        emit WagerCancelled(wagerId);
    }

    function getWager(uint256 wagerId) external view returns (Wager memory) {
        return wagers[wagerId];
    }

    function getWagerCount() external view returns (uint256) {
        return nextWagerId;
    }

    /**
     * @notice Emergency withdrawal by owner (only for stuck funds).
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner nonReentrant {
        uint256 available = usdc.balanceOf(address(this)) - totalLocked;
        require(amount <= available, "Amount exceeds unlocked balance");
        require(usdc.transfer(owner(), amount), "Withdraw failed");
    }
}
