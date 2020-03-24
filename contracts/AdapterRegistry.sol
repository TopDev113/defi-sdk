pragma solidity 0.6.4;
pragma experimental ABIEncoderV2;

import { Ownable } from "./Ownable.sol";
import { ProtocolManager } from "./ProtocolManager.sol";
import { TokenAdapterManager } from "./TokenAdapterManager.sol";
import { ProtocolAdapter } from "./adapters/ProtocolAdapter.sol";
import { TokenAdapter } from "./adapters/TokenAdapter.sol";
import { Strings } from "./Strings.sol";
import {
    ProtocolBalance,
    ProtocolMetadata,
    AdapterBalance,
    AdapterMetadata,
    FullTokenBalance,
    TokenBalance,
    TokenMetadata,
    Component
} from "./Structs.sol";


/**
* @title Registry for protocols, protocol adapters, and token adapters.
* @notice getBalances() function implements the main functionality.
*/
contract AdapterRegistry is Ownable, ProtocolManager, TokenAdapterManager {

    using Strings for string;

    /**
     * @param tokenType String with type of the token.
     * @param token Address of the token.
     * @return Full token balance by token type and token address.
     */
    function getFullTokenBalance(
        string calldata tokenType,
        address token
    )
        external
        view
        returns (FullTokenBalance memory)
    {
        Component[] memory components = getComponents(tokenType, token, 1e18);
        return getFullTokenBalance(tokenType, token, 1e18, components);
    }

    /**
     * @param tokenType String with type of the token.
     * @param token Address of the token.
     * @return Final full token balance by token type and token address.
     */
    function getFinalFullTokenBalance(
        string calldata tokenType,
        address token
    )
        external
        view
        returns (FullTokenBalance memory)
    {
        Component[] memory finalComponents = getFinalComponents(tokenType, token, 1e18);
        return getFullTokenBalance(tokenType, token, 1e18, finalComponents);
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
        string[] memory protocolNames = getProtocolNames();

        return getProtocolBalances(account, protocolNames);
    }

    /**
     * @param account Address of the account.
     * @param protocolNames Array of the protocols' names.
     * @return ProtocolBalance array by the given account and names of protocols.
     */
    function getProtocolBalances(
        address account,
        string[] memory protocolNames
    )
        public
        view
        returns (ProtocolBalance[] memory)
    {
        ProtocolBalance[] memory protocolBalances = new ProtocolBalance[](protocolNames.length);

        for (uint256 i = 0; i < protocolNames.length; i++) {
            protocolBalances[i] = ProtocolBalance({
                metadata: protocolMetadata[protocolNames[i]],
                adapterBalances: getAdapterBalances(account, protocolAdapters[protocolNames[i]])
            });
        }

        return protocolBalances;
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

        for (uint256 i = 0; i < adapterBalances.length; i++) {
            adapterBalances[i] = getAdapterBalance(
                account,
                adapters[i],
                supportedTokens[adapters[i]]
            );
        }

        return adapterBalances;
    }

    /**
     * @param account Address of the account.
     * @param adapter Address of the protocol adapter.
     * @param tokens Array with tokens' addresses.
     * @return AdapterBalance array by the given parameters.
     */
    function getAdapterBalance(
        address account,
        address adapter,
        address[] memory tokens
    )
        public
        view
        returns (AdapterBalance memory)
    {
        FullTokenBalance[] memory finalFullTokenBalances = new FullTokenBalance[](tokens.length);
        uint256 amount;
        string memory tokenType;

        for (uint256 i = 0; i < tokens.length; i++) {
            try ProtocolAdapter(adapter).getBalance(tokens[i], account) returns (uint256 result) {
                amount = result;
            } catch {
                amount = 0;
            }

            tokenType = ProtocolAdapter(adapter).tokenType();

            finalFullTokenBalances[i] = getFullTokenBalance(
                tokenType,
                tokens[i],
                amount,
                getFinalComponents(tokenType, tokens[i], 1e18)
            );
        }

        return AdapterBalance({
            metadata: AdapterMetadata({
                adapterAddress: adapter,
                adapterType: ProtocolAdapter(adapter).adapterType()
            }),
            balances: finalFullTokenBalances
        });
    }

    /**
     * @param tokenType Type of the base token.
     * @param token Address of the base token.
     * @param amount Amount of the base token.
     * @param components Components of the base token.
     * @return FullTokenBalance struct by the given components.
     */
    function getFullTokenBalance(
        string memory tokenType,
        address token,
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
                components[i].tokenType,
                components[i].token,
                components[i].rate * amount / 1e18
            );
        }

        return FullTokenBalance({
            base: getTokenBalance(tokenType, token, amount),
            underlying: componentTokenBalances
        });
    }

    /**
     * @param tokenType String with type of the token.
     * @param token Address of the token.
     * @param amount Amount of the token.
     * @return Final components by token type and token address.
     */
    function getFinalComponents(
        string memory tokenType,
        address token,
        uint256 amount
    )
        internal
        view
        returns (Component[] memory)
    {
        uint256 totalLength;

        totalLength = getFinalComponentsNumber(tokenType, token, true);

        Component[] memory finalTokens = new Component[](totalLength);
        uint256 length;
        uint256 init = 0;

        Component[] memory components = getComponents(tokenType, token, amount);
        Component[] memory finalComponents;

        for (uint256 i = 0; i < components.length; i++) {
            finalComponents = getFinalComponents(
                components[i].tokenType,
                components[i].token,
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
     * @param tokenType String with type of the token.
     * @param token Address of the token.
     * @param initial Whether the function call is initial or recursive.
     * @return Final tokens number by token type and token.
     */
    function getFinalComponentsNumber(
        string memory tokenType,
        address token,
        bool initial
    )
        internal
        view
        returns (uint256)
    {
        if (tokenType.isEqualTo("ERC20")) {
            return initial ? uint256(0) : uint256(1);
        }

        uint256 totalLength = 0;
        Component[] memory components = getComponents(tokenType, token, 1e18);

        for (uint256 i = 0; i < components.length; i++) {
            totalLength = totalLength + getFinalComponentsNumber(
                components[i].tokenType,
                components[i].token,
                false
            );
        }

        return totalLength;
    }

    /**
     * @param tokenType String with type of the token.
     * @param token Address of the token.
     * @param amount Amount of the token.
     * @return Components by token type and token address.
     */
    function getComponents(
        string memory tokenType,
        address token,
        uint256 amount
    )
        internal
        view
        returns (Component[] memory)
    {
        TokenAdapter adapter = TokenAdapter(tokenAdapter[tokenType]);
        Component[] memory components;

        try adapter.getComponents(token) returns (Component[] memory result) {
            components = result;
        } catch {
            components = new Component[](0);
        }

        for (uint256 i = 0; i < components.length; i++) {
            components[i].rate = components[i].rate * amount / 1e18;
        }

        return components;
    }

    /**
     * @notice Fulfills TokenBalance struct using type, address, and balance of the token.
     * @param tokenType String with type of the token.
     * @param token Address of the token.
     * @param amount Amount of tokens.
     * @return TokenBalance struct with token info and balance.
     */
    function getTokenBalance(
        string memory tokenType,
        address token,
        uint256 amount
    )
        internal
        view
        returns (TokenBalance memory)
    {
        TokenAdapter adapter = TokenAdapter(tokenAdapter[tokenType]);

        try adapter.getMetadata(token) returns (TokenMetadata memory result) {
            return TokenBalance({
                metadata: result,
                amount: amount
            });
        } catch {
            return TokenBalance({
                metadata: TokenMetadata({
                    token: token,
                    name: "Not available",
                    symbol: "N/A",
                    decimals: 18
                }),
                amount: amount
            });
        }
    }
}
