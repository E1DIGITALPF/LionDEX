// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IUniswapV2Router02.sol";
import "./interfaces/IUniswapV2Factory.sol";

contract CustomRouter is Ownable {
    using SafeERC20 for IERC20;
    
    IUniswapV2Router02 public immutable baseRouter;
    IUniswapV2Factory public immutable factory;
    
    constructor(address _baseRouter) Ownable(msg.sender) {
        baseRouter = IUniswapV2Router02(_baseRouter);
        factory = IUniswapV2Factory(IUniswapV2Router02(_baseRouter).factory());
    }
    
    function swapExactTokensForTokensWithFee(
        uint amountIn,
        uint amountOutMin,
        uint feeAmount,
        address feeRecipient,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts) {
        require(path.length >= 2, "Invalid path");
        
        IERC20(path[0]).safeTransferFrom(msg.sender, address(this), amountIn);
        
        IERC20(path[0]).approve(address(baseRouter), 0);
        IERC20(path[0]).approve(address(baseRouter), amountIn);
        
        amounts = baseRouter.swapExactTokensForTokens(
            amountIn,
            amountOutMin + feeAmount,
            path,
            address(this),
            deadline
        );
        
        IERC20(path[path.length - 1]).safeTransfer(feeRecipient, feeAmount);
        
        IERC20(path[path.length - 1]).safeTransfer(to, amounts[amounts.length - 1] - feeAmount);
        
        return amounts;
    }
    
    function swapExactETHForTokensWithFee(
        uint amountOutMin,
        uint feeAmount,
        address feeRecipient,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable returns (uint[] memory amounts) {
        require(path.length >= 2, "Invalid path");
        
        amounts = baseRouter.swapExactETHForTokens{value: msg.value}(
            amountOutMin + feeAmount,
            path,
            address(this),
            deadline
        );
        
        IERC20(path[path.length - 1]).safeTransfer(feeRecipient, feeAmount);
        
        IERC20(path[path.length - 1]).safeTransfer(to, amounts[amounts.length - 1] - feeAmount);
        
        return amounts;
    }
    
    function swapExactTokensForETHWithFee(
        uint amountIn,
        uint amountOutMin,
        uint feeAmount,
        address feeRecipient,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts) {
        require(path.length >= 2, "Invalid path");
        
        IERC20(path[0]).safeTransferFrom(msg.sender, address(this), amountIn);
        
        IERC20(path[0]).approve(address(baseRouter), 0);
        IERC20(path[0]).approve(address(baseRouter), amountIn);
        
        amounts = baseRouter.swapExactTokensForETH(
            amountIn,
            amountOutMin + feeAmount,
            path,
            address(this),
            deadline
        );
        
        payable(feeRecipient).transfer(feeAmount);
        
        payable(to).transfer(amounts[amounts.length - 1] - feeAmount);
        
        return amounts;
    }
    
    receive() external payable {}
}