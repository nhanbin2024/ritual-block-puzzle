// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RitualLevelNFT {
    string public name = "Ritual Block Puzzle Level NFT";
    string public symbol = "RBP";
    address public owner;
    uint256 public totalSupply;

    mapping(uint256 => address) public ownerOf;
    mapping(address => uint256[]) private walletTokens;
    mapping(address => mapping(uint256 => bool)) public hasMintedLevel;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event LevelNFTMinted(address indexed player, uint256 indexed tokenId, uint256 indexed level);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function mintLevelNFT(address player, uint256 level) external onlyOwner returns (uint256) {
        require(player != address(0), "Invalid player");
        require(level >= 1 && level <= 50, "Invalid level");
        require(!hasMintedLevel[player][level], "Already minted this level");
        totalSupply += 1;
        uint256 tokenId = totalSupply;
        ownerOf[tokenId] = player;
        walletTokens[player].push(tokenId);
        hasMintedLevel[player][level] = true;
        emit Transfer(address(0), player, tokenId);
        emit LevelNFTMinted(player, tokenId, level);
        return tokenId;
    }

    function getWalletNFTs(address player) external view returns (uint256[] memory) {
        return walletTokens[player];
    }

    function hasMinted(address player, uint256 level) external view returns (bool) {
        return hasMintedLevel[player][level];
    }
}
