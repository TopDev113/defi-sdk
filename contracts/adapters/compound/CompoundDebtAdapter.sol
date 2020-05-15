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

pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;

import { ERC20 } from "../../ERC20.sol";
import { ProtocolAdapter } from "../ProtocolAdapter.sol";


/**
 * @dev CToken contract interface.
 * Only the functions required for CompoundDebtAdapter contract are added.
 * The CToken contract is available here
 * github.com/compound-finance/compound-protocol/blob/master/contracts/CToken.sol.
 */
interface CToken {
    function borrowBalanceStored(address) external view returns (uint256);
}


/**
 * @dev CompoundRegistry contract interface.
 * Only the functions required for CompoundDebtAdapter contract are added.
 * The CompoundRegistry contract is available in this repository.
 */
interface CompoundRegistry {
    function getCToken(address) external view returns (address);
}


/**
 * @title Debt adapter for Compound protocol.
 * @dev Implementation of ProtocolAdapter interface.
 * @author Igor Sobolev <sobolev@zerion.io>
 */
contract CompoundDebtAdapter is ProtocolAdapter("Debt") {

    address internal constant REGISTRY = 0xD0ff11EA62C867F6dF8E9cc37bb5339107FAb141;

    /**
     * @return Amount of debt of the given account for the protocol.
     * @dev Implementation of ProtocolAdapter interface function.
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
        CToken cToken = CToken(CompoundRegistry(REGISTRY).getCToken(token));

        return (cToken.borrowBalanceStored(account), "ERC20");
    }
}
