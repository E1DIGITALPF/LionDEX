// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

contract FeeManager is Ownable {
    address public feeCollector;
    uint256 public feePercentage;
    uint256 public constant MAX_FEE = 500;
    
    event FeeCollectorUpdated(address indexed oldCollector, address indexed newCollector);
    event FeePercentageUpdated(uint256 oldPercentage, uint256 newPercentage);
    event FeesCollected(address indexed token, uint256 amount);

    constructor(
        address initialFeeCollector, 
        uint256 initialFeePercentage
    ) Ownable(msg.sender) {
        require(initialFeePercentage <= MAX_FEE, "Fee too high");
        feeCollector = initialFeeCollector;
        feePercentage = initialFeePercentage;
    }

    function setFeeCollector(address newCollector) external onlyOwner {
        require(newCollector != address(0), "Invalid address");
        emit FeeCollectorUpdated(feeCollector, newCollector);
        feeCollector = newCollector;
    }

    function setFeePercentage(uint256 newPercentage) external onlyOwner {
        require(newPercentage <= MAX_FEE, "Fee too high");
        emit FeePercentageUpdated(feePercentage, newPercentage);
        feePercentage = newPercentage;
    }

    function calculateFee(uint256 amount) public view returns (uint256) {
        return (amount * feePercentage) / 10000;
    }
} 