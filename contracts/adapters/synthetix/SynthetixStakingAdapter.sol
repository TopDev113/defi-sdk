// Copyright (C) 2020 Zerion Inc. <https://zerion.io>
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.
//
// SPDX-License-Identifier: LGPL-3.0-only

pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;

import { ERC20 } from "../../shared/ERC20.sol";
import { ProtocolAdapter } from "../ProtocolAdapter.sol";


/**
 * @dev StakingRewards contract interface.
 * Only the functions required for SynthetixAssetAdapter contract are added.
 * The StakingRewards contract is available here
 * github.com/Synthetixio/synthetix/blob/master/contracts/StakingRewards.sol.
 */
interface StakingRewards {
    function earned(address) external view returns (uint256);
}


/**
 * @dev Proxy contract interface.
 * Only the functions required for SynthetixAssetAdapter contract are added.
 * The Proxy contract is available here
 * github.com/Synthetixio/synthetix/blob/master/contracts/Proxy.sol.
 */
interface Proxy {
    function target() external view returns (address);
}


/**
 * @dev Synthetix contract interface.
 * Only the functions required for SynthetixAssetAdapter contract are added.
 * The Synthetix contract is available here
 * github.com/Synthetixio/synthetix/blob/master/contracts/Synthetix.sol.
 */
interface Synthetix {
    function collateral(address) external view returns (uint256);
}


/**
 * @title Asset adapter for Synthetix protocol.
 * @dev Implementation of ProtocolAdapter abstract contract.
 * @author Igor Sobolev <sobolev@zerion.io>
 */
contract SynthetixAssetAdapter is ProtocolAdapter {

    address internal immutable stakingContract_;
    address internal immutable stakingToken_;
    address internal immutable rewardsToken_;
    bytes32 internal immutable stakingTokenAdapterName_;
    bytes32 internal immutable rewardsTokenAdapterName_;

    constructor(
        address stakingContract,
        address stakingToken,
        address rewardsToken,
        bytes32 stakingTokenAdapterName,
        bytes32 rewardsTokenAdapterName
    )
        public
    {
        require(stakingContract != address(0), "SSA: empty stakingContract!");
        require(stakingToken != address(0), "SSA: empty stakingToken!");
        require(rewardsToken != address(0), "SSA: empty rewardsToken!");
        require(stakingTokenAdapterName != bytes32(0), "SSA: empty stakingTokenAdapterName!");
        require(rewardsTokenAdapterName != bytes32(0), "SSA: empty rewardsTokenAdapterName!");

        stakingContract_ = stakingContract;
        stakingToken_ = stakingToken;
        rewardsToken_ = rewardsToken;
        stakingTokenAdapterName_ = stakingTokenAdapterName;
        rewardsTokenAdapterName_ = rewardsTokenAdapterName;
    }

    /**
     * @return Amount of SNX locked on the protocol by the given account.
     * @dev Implementation of ProtocolAdapter abstract contract function.
     */
    function getBalance(
        address token,
        address account
    )
        public
        view
        override
        returns (uint256, bytes32)
    {
        if (token == stakingToken_) {
            return (ERC20(stakingContract_).balanceOf(account), stakingTokenAdapterName_);
        } else if (token == rewardsToken_) {
            return (StakingRewards(stakingContract_).earned(account), rewardsTokenAdapterName_);
        } else {
            return (0, bytes32(0));
        }
    }
}
