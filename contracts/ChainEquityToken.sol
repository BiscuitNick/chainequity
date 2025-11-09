// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ChainEquityToken
 * @dev ERC20 token with allowlist-based transfer restrictions, virtual stock splits, and mutable symbol
 * @notice This token implements restricted transfers where only allowlisted addresses can send/receive tokens
 */
contract ChainEquityToken is ERC20, Ownable {

    // ============================================
    // State Variables
    // ============================================

    /// @notice Mapping of addresses that are allowed to send/receive tokens
    mapping(address => bool) public allowlist;

    /// @notice Basis points for fixed-point math (10,000 = 1.0x, 5,000 = 0.5x, 20,000 = 2.0x)
    uint256 public constant BASIS_POINTS = 10000;

    /// @notice Multiplier for virtual stock splits in basis points (starts at 10,000 = 1.0x)
    uint256 public splitMultiplier = BASIS_POINTS;

    /// @notice Custom token symbol (overrides ERC20 default)
    string private _customSymbol;

    /// @notice Custom token name (overrides ERC20 default)
    string private _customName;

    // ============================================
    // Events
    // ============================================

    /// @notice Emitted when a wallet is approved to the allowlist
    event WalletApproved(address indexed wallet);

    /// @notice Emitted when a wallet is revoked from the allowlist
    event WalletRevoked(address indexed wallet);

    /// @notice Emitted when a stock split is executed
    event StockSplit(uint256 multiplier, uint256 newSplitMultiplier);

    /// @notice Emitted when the token symbol is changed
    event SymbolChanged(string oldSymbol, string newSymbol);

    /// @notice Emitted when the token name is changed
    event NameChanged(string oldName, string newName);

    /// @notice Emitted when a transfer is blocked due to allowlist restrictions
    event TransferBlocked(address indexed from, address indexed to, uint256 amount);

    // ============================================
    // Custom Errors
    // ============================================

    /// @notice Error thrown when transfer involves non-allowlisted address
    error NotInAllowlist(address account);

    /// @notice Error thrown when an invalid multiplier is provided
    error InvalidMultiplier();

    /// @notice Error thrown when an invalid symbol is provided
    error InvalidSymbol();

    /// @notice Error thrown when an invalid name is provided
    error InvalidName();

    /// @notice Error thrown when zero address is provided
    error ZeroAddress();

    /// @notice Error thrown when zero amount is provided
    error ZeroAmount();

    // ============================================
    // Constructor
    // ============================================

    /**
     * @dev Constructor to initialize the ChainEquityToken
     * @param name_ The name of the token
     * @param symbol_ The symbol of the token
     * @param initialOwner The address that will be set as the initial owner
     */
    constructor(
        string memory name_,
        string memory symbol_,
        address initialOwner
    ) ERC20(name_, symbol_) Ownable(initialOwner) {
        if (initialOwner == address(0)) revert ZeroAddress();

        // Store custom name and symbol
        _customName = name_;
        _customSymbol = symbol_;

        // Automatically add the owner to the allowlist
        allowlist[initialOwner] = true;
        emit WalletApproved(initialOwner);
    }

    // ============================================
    // Allowlist Management Functions
    // ============================================

    /**
     * @notice Approve a wallet to send/receive tokens
     * @param wallet The address to approve
     */
    function approveWallet(address wallet) external onlyOwner {
        if (wallet == address(0)) revert ZeroAddress();
        if (allowlist[wallet]) return; // Already approved, no need to emit event again

        allowlist[wallet] = true;
        emit WalletApproved(wallet);
    }

    /**
     * @notice Revoke a wallet's ability to send/receive tokens
     * @param wallet The address to revoke
     */
    function revokeWallet(address wallet) external onlyOwner {
        if (wallet == address(0)) revert ZeroAddress();
        if (!allowlist[wallet]) return; // Already revoked, no need to emit event again

        allowlist[wallet] = false;
        emit WalletRevoked(wallet);
    }

    /**
     * @notice Check if a wallet is approved
     * @param wallet The address to check
     * @return bool True if the wallet is approved
     */
    function isApproved(address wallet) external view returns (bool) {
        return allowlist[wallet];
    }

    // ============================================
    // Transfer Restriction Override
    // ============================================

    /**
     * @dev Override _update to enforce allowlist restrictions
     * @param from The address tokens are transferred from
     * @param to The address tokens are transferred to
     * @param value The amount of tokens to transfer
     */
    function _update(address from, address to, uint256 value) internal virtual override {
        // Allow minting (from == address(0)) and burning (to == address(0))
        if (from != address(0) && to != address(0)) {
            // Check if both sender and receiver are in allowlist
            if (!allowlist[from]) {
                emit TransferBlocked(from, to, value);
                revert NotInAllowlist(from);
            }
            if (!allowlist[to]) {
                emit TransferBlocked(from, to, value);
                revert NotInAllowlist(to);
            }
        } else if (from == address(0)) {
            // Minting: ensure recipient is in allowlist
            if (!allowlist[to]) {
                emit TransferBlocked(from, to, value);
                revert NotInAllowlist(to);
            }
        }
        // Burning (to == address(0)) doesn't require allowlist check

        super._update(from, to, value);
    }

    // ============================================
    // Stock Split Functionality
    // ============================================

    /**
     * @notice Execute a virtual stock split
     * @param multiplierBasisPoints The multiplier in basis points
     *        (e.g., 20000 for 2:1 split, 5000 for 1:2 reverse split)
     * @dev Multiplier must be > 0 and != BASIS_POINTS (10000)
     * @dev Examples: 20000 = 2.0x (2-for-1), 70000 = 7.0x (7-for-1), 1000 = 0.1x (1-for-10 reverse)
     */
    function executeSplit(uint256 multiplierBasisPoints) external onlyOwner {
        if (multiplierBasisPoints == 0 || multiplierBasisPoints == BASIS_POINTS) revert InvalidMultiplier();

        // Multiply using fixed-point math: (splitMultiplier * multiplierBasisPoints) / BASIS_POINTS
        splitMultiplier = (splitMultiplier * multiplierBasisPoints) / BASIS_POINTS;

        emit StockSplit(multiplierBasisPoints, splitMultiplier);
    }

    /**
     * @notice Get the current split multiplier
     * @return uint256 The current split multiplier
     */
    function getSplitMultiplier() external view returns (uint256) {
        return splitMultiplier;
    }

    /**
     * @dev Override balanceOf to account for split multiplier (using fixed-point math)
     * @param account The address to check balance for
     * @return uint256 The balance multiplied by the split multiplier (divided by BASIS_POINTS for precision)
     */
    function balanceOf(address account) public view virtual override returns (uint256) {
        return (super.balanceOf(account) * splitMultiplier) / BASIS_POINTS;
    }

    /**
     * @dev Override totalSupply to account for split multiplier (using fixed-point math)
     * @return uint256 The total supply multiplied by the split multiplier (divided by BASIS_POINTS for precision)
     */
    function totalSupply() public view virtual override returns (uint256) {
        return (super.totalSupply() * splitMultiplier) / BASIS_POINTS;
    }

    // ============================================
    // Mutable Symbol/Name Functionality
    // ============================================

    /**
     * @dev Override symbol to return custom symbol if set
     * @return string The token symbol
     */
    function symbol() public view virtual override returns (string memory) {
        return bytes(_customSymbol).length > 0 ? _customSymbol : super.symbol();
    }

    /**
     * @dev Override name to return custom name if set
     * @return string The token name
     */
    function name() public view virtual override returns (string memory) {
        return bytes(_customName).length > 0 ? _customName : super.name();
    }

    /**
     * @notice Update the token symbol
     * @param newSymbol The new symbol for the token
     */
    function updateSymbol(string memory newSymbol) external onlyOwner {
        if (bytes(newSymbol).length == 0) revert InvalidSymbol();
        if (bytes(newSymbol).length > 11) revert InvalidSymbol();

        string memory oldSymbol = _customSymbol;
        _customSymbol = newSymbol;

        emit SymbolChanged(oldSymbol, newSymbol);
    }

    /**
     * @notice Update the token name
     * @param newName The new name for the token
     */
    function updateName(string memory newName) external onlyOwner {
        if (bytes(newName).length == 0) revert InvalidName();

        string memory oldName = _customName;
        _customName = newName;

        emit NameChanged(oldName, newName);
    }

    // ============================================
    // Minting Functionality
    // ============================================

    /**
     * @notice Mint new tokens to a specified address
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint (before split multiplier)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        _mint(to, amount);
    }
}
