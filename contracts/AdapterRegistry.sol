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

import {
    ProtocolBalance,
    ProtocolMetadata,
    AdapterBalance,
    AdapterMetadata,
    FullTokenBalance,
    TokenBalance,
    TokenMetadata,
    ERC20Metadata,
    Component
} from "./Structs.sol";
import { Ownable } from "./Ownable.sol";
import { ProtocolManager } from "./ProtocolManager.sol";
import { TokenAdapterManager } from "./TokenAdapterManager.sol";
import { ProtocolAdapter } from "./adapters/ProtocolAdapter.sol";
import { TokenAdapter } from "./adapters/TokenAdapter.sol";


/**
 * @title Registry for protocols, adapters, and token adapters.
 * @notice getBalances() function implements the main functionality.
 * @author Igor Sobolev <sobolev@zerion.io>
 */
contract AdapterRegistry is Ownable, ProtocolManager, TokenAdapterManager {

    /**
     * @param tokenAddresses Array of tokens' addresses.
     * @param tokenTypes Array of tokens' types.
     * @return Full token balances by token types and token addresses.
     */
    function getFullTokenBalances(
        address[] calldata tokenAddresses,
        bytes32[] calldata tokenTypes
    )
        external
        view
        returns (FullTokenBalance[] memory)
    {
        uint256 length = tokenTypes.length;
        require(length == tokenAddresses.length, "AR: tokenTypes and tokens differ!");

        Component[] memory components;
        FullTokenBalance[] memory balances = new FullTokenBalance[](length);
        for (uint256 i = 0; i < length; i++) {
            components = getComponents(tokenAddresses[i], tokenTypes[i], 1e18);
            balances[i] = getFullTokenBalance(tokenAddresses[i], tokenTypes[i], 1e18, components);
        }

        return balances;
    }

    /**
     * @param tokenAddresses Array of tokens' addresses.
     * @param tokenTypes Array of tokens' types.
     * @return Final full token balances by token types and token addresses.
     */
    function getFinalFullTokenBalances(
        address[] calldata tokenAddresses,
        bytes32[] calldata tokenTypes
    )
        external
        view
        returns (FullTokenBalance[] memory)
    {
        uint256 length = tokenTypes.length;
        require(length == tokenAddresses.length, "AR: tokenTypes and tokens differ!");

        Component[] memory components;
        FullTokenBalance[] memory balances = new FullTokenBalance[](length);
        for (uint256 i = 0; i < length; i++) {
            components = getFinalComponents(tokenAddresses[i], tokenTypes[i], 1e18);
            balances[i] = getFullTokenBalance(tokenAddresses[i], tokenTypes[i], 1e18, components);
        }

        return balances;
    }

    /**
     * @param account Address of the account.
     * @return ProtocolBalance array by the given account.
     */
    function getBalances(
        address account
    )
        external
        view
        returns (ProtocolBalance[] memory)
    {
        bytes32[] memory protocolNames = getProtocolNames();

        return getProtocolBalances(account, protocolNames);
    }

    /**
     * @param account Address of the account.
     * @param protocolNames Array of the protocols' names.
     * @return ProtocolBalance array by the given account and names of protocols.
     */
    function getProtocolBalances(
        address account,
        bytes32[] memory protocolNames
    )
        public
        view
        returns (ProtocolBalance[] memory)
    {
        ProtocolBalance[] memory protocolBalances = new ProtocolBalance[](protocolNames.length);
        uint256 counter = 0;

        for (uint256 i = 0; i < protocolNames.length; i++) {
            protocolBalances[i] = ProtocolBalance({
                protocolName: protocolNames[i],
                adapterBalances: getAdapterBalances(account, protocolAdapters[protocolNames[i]])
            });
            if (protocolBalances[i].adapterBalances.length > 0) {
                counter++;
            }
        }

        ProtocolBalance[] memory nonZeroProtocolBalances = new ProtocolBalance[](counter);
        counter = 0;

        for (uint256 i = 0; i < protocolNames.length; i++) {
            if (protocolBalances[i].adapterBalances.length > 0) {
                nonZeroProtocolBalances[counter] = protocolBalances[i];
                counter++;
            }
        }

        return nonZeroProtocolBalances;
    }

    /**
     * @param account Address of the account.
     * @param adapters Array of the protocol adapters' addresses.
     * @return AdapterBalance array by the given parameters.
     */
    function getAdapterBalances(
        address account,
        address[] memory adapters
    )
        public
        view
        returns (AdapterBalance[] memory)
    {
        AdapterBalance[] memory adapterBalances = new AdapterBalance[](adapters.length);
        uint256 counter = 0;

        for (uint256 i = 0; i < adapterBalances.length; i++) {
            adapterBalances[i] = getAdapterBalance(
                account,
                adapters[i],
                supportedTokens[adapters[i]]
            );
            if (adapterBalances[i].balances.length > 0) {
                counter++;
            }
        }

        AdapterBalance[] memory nonZeroAdapterBalances = new AdapterBalance[](counter);
        counter = 0;

        for (uint256 i = 0; i < adapterBalances.length; i++) {
            if (adapterBalances[i].balances.length > 0) {
                nonZeroAdapterBalances[counter] = adapterBalances[i];
                counter++;
            }
        }

        return nonZeroAdapterBalances;
    }

    /**
     * @param account Address of the account.
     * @param adapter Address of the protocol adapter.
     * @param tokenAddresses Array with tokens' addresses.
     * @return AdapterBalance array by the given parameters.
     */
    function getAdapterBalance(
        address account,
        address adapter,
        address[] memory tokenAddresses
    )
        public
        view
        returns (AdapterBalance memory)
    {
        if (adapter == address(0)) {
            return AdapterBalance({
                metadata: AdapterMetadata({
                    adapterAddress: address(0),
                    adapterType: bytes32(0)
                }),
                balances: new TokenBalance[](0)
            });
        }

        bytes32[] memory tokenTypes = new bytes32[](tokenAddresses.length);
        uint256[] memory amounts = new uint256[](tokenAddresses.length);
        uint256 counter;

        for (uint256 i = 0; i < amounts.length; i++) {
            try ProtocolAdapter(adapter).getBalance(
                tokenAddresses[i],
                account
            ) returns (uint256 amount, bytes32 tokenType) {
                amounts[i] = amount;
                tokenTypes[i] = tokenType;
            } catch {
                amounts[i] = 0;
                tokenTypes[i] = "ERC20";
            }
            if (amounts[i] > 0) {
                counter++;
            }
        }

        TokenBalance[] memory tokenBalances = new TokenBalance[](counter);
        counter = 0;

        for (uint256 i = 0; i < amounts.length; i++) {
            if (amounts[i] > 0) {
                tokenBalances[counter] = getTokenBalance(
                    tokenAddresses[i],
                    tokenTypes[i],
                    amounts[i]
                );
                counter++;
            }
        }

        return AdapterBalance({
            metadata: AdapterMetadata({
                adapterAddress: adapter,
                adapterType: ProtocolAdapter(adapter).adapterType()
            }),
            balances: tokenBalances
        });
    }

    /**
     * @param tokenAddress Address of the base token.
     * @param tokenType Type of the base token.
     * @param amount Amount of the base token.
     * @param components Components of the base token.
     * @return FullTokenBalance struct by the given components.
     */
    function getFullTokenBalance(
        address tokenAddress,
        bytes32 tokenType,
        uint256 amount,
        Component[] memory components
    )
        internal
        view
        returns (FullTokenBalance memory)
    {
        TokenBalance[] memory componentTokenBalances = new TokenBalance[](components.length);

        for (uint256 i = 0; i < components.length; i++) {
            componentTokenBalances[i] = getTokenBalance(
                components[i].tokenAddress,
                components[i].tokenType,
                components[i].rate
            );
        }

        return FullTokenBalance({
            base: getTokenBalance(tokenAddress, tokenType, amount),
            underlying: componentTokenBalances
        });
    }

    /**
     * @param tokenAddress Address of the token.
     * @param tokenType Type of the token.
     * @param amount Amount of the token.
     * @return Final components by token type and token address.
     */
    function getFinalComponents(
        address tokenAddress,
        bytes32 tokenType,
        uint256 amount
    )
        internal
        view
        returns (Component[] memory)
    {
        uint256 totalLength = getFinalComponentsNumber(tokenAddress, tokenType, true);
        Component[] memory finalTokens = new Component[](totalLength);
        uint256 length;
        uint256 init = 0;

        Component[] memory components = getComponents(tokenAddress, tokenType, amount);
        Component[] memory finalComponents;

        for (uint256 i = 0; i < components.length; i++) {
            finalComponents = getFinalComponents(
                components[i].tokenAddress,
                components[i].tokenType,
                components[i].rate
            );

            length = finalComponents.length;

            if (length == 0) {
                finalTokens[init] = components[i];
                init = init + 1;
            } else {
                for (uint256 j = 0; j < length; j++) {
                    finalTokens[init + j] = finalComponents[j];
                }

                init = init + length;
            }
        }

        return finalTokens;
    }

    /**
     * @param tokenAddress Address of the token.
     * @param tokenType Type of the token.
     * @param initial Whether the function call is initial or recursive.
     * @return Final tokens number by token type and token.
     */
    function getFinalComponentsNumber(
        address tokenAddress,
        bytes32 tokenType,
        bool initial
    )
        internal
        view
        returns (uint256)
    {
        uint256 totalLength = 0;
        Component[] memory components = getComponents(tokenAddress, tokenType, 1e18);

        if (components.length == 0) {
            return initial ? uint256(0) : uint256(1);
        }

        for (uint256 i = 0; i < components.length; i++) {
            totalLength = totalLength + getFinalComponentsNumber(
                components[i].tokenAddress,
                components[i].tokenType,
                false
            );
        }

        return totalLength;
    }

    /**
     * @param tokenAddress Address of the token.
     * @param tokenType Type of the token.
     * @param amount Amount of the token.
     * @return Components by token type and token address.
     */
    function getComponents(
        address tokenAddress,
        bytes32 tokenType,
        uint256 amount
    )
        internal
        view
        returns (Component[] memory)
    {
        TokenAdapter tokenAdapter = TokenAdapter(tokenAdapterAddress[tokenType]);
        Component[] memory components;

        if (address(tokenAdapter) != address(0)) {
            try tokenAdapter.getComponents(tokenAddress) returns (Component[] memory result) {
                components = result;
            } catch {
                components = new Component[](0);
            }
        } else {
            components = new Component[](0);
        }

        for (uint256 i = 0; i < components.length; i++) {
            components[i].rate = components[i].rate * amount / 1e18;
        }

        return components;
    }

    /**
     * @notice Fulfills TokenBalance struct using type, address, and balance of the token.
     * @param tokenAddress Address of the token.
     * @param tokenType Type of the token.
     * @param amount Amount of tokens.
     * @return TokenBalance struct with token info and balance.
     */
    function getTokenBalance(
        address tokenAddress,
        bytes32 tokenType,
        uint256 amount
    )
        internal
        view
        returns (TokenBalance memory)
    {
        TokenAdapter tokenAdapter = TokenAdapter(tokenAdapterAddress[tokenType]);
        TokenBalance memory tokenBalance;
        tokenBalance.amount = amount;

        if (address(tokenAdapter) != address(0)) {
            try tokenAdapter.getMetadata(
                tokenAddress
            )
                returns (ERC20Metadata memory erc20)
            {
                tokenBalance.metadata = TokenMetadata({
                    tokenAddress: tokenAddress,
                    tokenType: tokenType,
                    erc20: erc20
                });
            } catch {
                tokenBalance.metadata = TokenMetadata({
                    tokenAddress: tokenAddress,
                    tokenType: tokenType,
                    erc20: ERC20Metadata({
                        name: "Not available",
                        symbol: "N/A",
                        decimals: 0
                    })
                });
            }
        } else {
            tokenBalance.metadata = TokenMetadata({
                tokenAddress: tokenAddress,
                tokenType: tokenType,
                erc20: ERC20Metadata({
                    name: "Not available",
                    symbol: "N/A",
                    decimals: 0
                })
            });
        }

        return tokenBalance;
    }
}
