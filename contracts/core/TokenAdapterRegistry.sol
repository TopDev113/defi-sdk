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

import {
    FullAbsoluteTokenAmount,
    AbsoluteTokenAmountMeta,
    ERC20Metadata,
    AdapterBalance,
    AbsoluteTokenAmount,
    Component
} from "../shared/Structs.sol";
import { ERC20 } from "../shared/ERC20.sol";
import { Ownable } from "./Ownable.sol";
import { ProtocolAdapterManager } from "./ProtocolAdapterManager.sol";
import { TokenAdapterNamesManager } from "./TokenAdapterNamesManager.sol";
import { TokenAdapterManager } from "./TokenAdapterManager.sol";
import { ProtocolAdapter } from "../adapters/ProtocolAdapter.sol";
import { TokenAdapter } from "../adapters/TokenAdapter.sol";


/**
 * @title Registry for token adapters and protocol hashes.
 * @notice getBalances() function implements the main functionality.
 * @author Igor Sobolev <sobolev@zerion.io>
 */
contract TokenAdapterRegistry is Ownable, TokenAdapterManager, TokenAdapterNamesManager {

    address internal constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    /**
     * @dev Fills in FullAbsoluteTokenAmount struct for an array of AbsoluteTokenAmount structs.
     * @param absoluteTokenAmounts Array of AbsoluteTokenAmount structs consisting of
     * token address and amount.
     * @return Full absolute token amounts by token addresses and absolute amounts.
     */
    function getFullAbsoluteTokenAmounts(
        AbsoluteTokenAmount[] calldata absoluteTokenAmounts
    )
        external
        view
        returns (FullAbsoluteTokenAmount[] memory)
    {
        uint256 length = absoluteTokenAmounts.length;

        FullAbsoluteTokenAmount[] memory fullAbsoluteTokenAmounts =
            new FullAbsoluteTokenAmount[](length);

        for (uint256 i = 0; i < length; i++) {
            fullAbsoluteTokenAmounts[i] = getFullAbsoluteTokenAmount(absoluteTokenAmounts[i]);
        }

        return fullAbsoluteTokenAmounts;
    }

    /**
     * @dev Fills in FullAbsoluteTokenAmount struct for an array of tokens,
     * amount is considered to be 10 ** decimals.
     * @param tokens Array of tokens' addresses.
     * @return Full absolute token amounts by token addresses.
     */
    function getFullAbsoluteTokenAmounts(
        address[] calldata tokens
    )
        external
        view
        returns (FullAbsoluteTokenAmount[] memory)
    {
        uint256 length = tokens.length;

        FullAbsoluteTokenAmount[] memory fullAbsoluteTokenAmounts =
            new FullAbsoluteTokenAmount[](length);

        uint8 decimals;
        for (uint256 i = 0; i < length; i++) {
            decimals = tokens[i] == ETH ? 18 : ERC20(tokens[i]).decimals();

            fullAbsoluteTokenAmounts[i] = getFullAbsoluteTokenAmount(
                AbsoluteTokenAmount({
                    token: tokens[i],
                    amount: uint256(10) ** decimals
                })
            );
        }

        return fullAbsoluteTokenAmounts;
    }

    /**
     * @dev Fills in FullAbsoluteTokenAmount struct for a single token.
     * @param absoluteTokenAmount Struct consisting of
     * token address and its absolute amount.
     * @return Full absolute token amount by token address and absolute amount.
     */
    function getFullAbsoluteTokenAmount(
        AbsoluteTokenAmount memory absoluteTokenAmount
    )
        internal
        view
        returns (FullAbsoluteTokenAmount memory)
    {
        Component[] memory components = getComponents(absoluteTokenAmount);
        AbsoluteTokenAmountMeta[] memory componentAbsoluteTokenAmounts =
            new AbsoluteTokenAmountMeta[](components.length);

        uint256 length = components.length;
        for (uint256 i = 0; i < length; i++) {
            componentAbsoluteTokenAmounts[i] = getAbsoluteTokenAmountMeta(
                AbsoluteTokenAmount({
                    token: components[i].token,
                    amount: components[i].rate
                })
            );
        }

        return FullAbsoluteTokenAmount({
            base: getAbsoluteTokenAmountMeta(absoluteTokenAmount),
            underlying: componentAbsoluteTokenAmounts
        });
    }

    /**
     * @dev Fetches internal data about underlying components.
     * @param absoluteTokenAmount Struct consisting of
     * token address and absolute amount.
     * @return Array of Component structs by token address and absolute amount.
     */
    function getComponents(
        AbsoluteTokenAmount memory absoluteTokenAmount
    )
        internal
        view
        returns (Component[] memory)
    {
        bytes32 tokenAdapterName = getTokenAdapterNameByToken(absoluteTokenAmount.token);
        address tokenAdapter = _tokenAdapterAddress[tokenAdapterName];
        Component[] memory components;

        if (tokenAdapter == address(0)) {
            components = new Component[](0);
        } else {
            try TokenAdapter(tokenAdapter).getComponents(
                absoluteTokenAmount.token
            ) returns (Component[] memory result) {
                components = result;
            } catch {
                components = new Component[](0);
            }
        }

        for (uint256 i = 0; i < components.length; i++) {
            components[i].rate = components[i].rate * absoluteTokenAmount.amount / 1e18;
        }

        return components;
    }

    /**
     * @notice Fills in AbsoluteTokenAmountMeta for AbsoluteTokenAmount struct.
     * @param absoluteTokenAmount Struct consisting of
     * token address and absolute amount.
     * @return AbsoluteTokenAmountMeta struct by token address and absolute amount.
     */
    function getAbsoluteTokenAmountMeta(
        AbsoluteTokenAmount memory absoluteTokenAmount
    )
        internal
        view
        returns (AbsoluteTokenAmountMeta memory)
    {
        bytes32 tokenAdapterName = getTokenAdapterNameByToken(absoluteTokenAmount.token);
        address tokenAdapter = _tokenAdapterAddress[tokenAdapterName];
        ERC20Metadata memory erc20metadata;

        if (tokenAdapter == address(0)) {
            erc20metadata = ERC20Metadata({
                name: "Not available",
                symbol: "N/A",
                decimals: 0
            });
        } else {
            try TokenAdapter(tokenAdapter).getMetadata(
                absoluteTokenAmount.token
            )
                returns (ERC20Metadata memory result)
            {
                erc20metadata = result;
            } catch {
                erc20metadata = ERC20Metadata({
                    name: "Not available",
                    symbol: "N/A",
                    decimals: 0
                });
            }
        }

        return AbsoluteTokenAmountMeta({
            absoluteTokenAmount: absoluteTokenAmount,
            erc20metadata: erc20metadata
        });
    }
}
