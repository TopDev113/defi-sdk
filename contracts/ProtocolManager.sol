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

pragma solidity 0.6.6;
pragma experimental ABIEncoderV2;

import { Ownable } from "./Ownable.sol";
import { ProtocolMetadata } from "./Structs.sol";


/**
 * @title AdapterRegistry part responsible for protocols and adapters management.
 * @dev Base contract for AdapterRegistry.
 * @author Igor Sobolev <sobolev@zerion.io>
 */
abstract contract ProtocolManager is Ownable {

    bytes32 internal constant INITIAL_PROTOCOL_NAME = "Initial protocol name";

    // protocol name => next protocol name (linked list)
    mapping (bytes32 => bytes32) internal nextProtocolName;
    // protocol name => protocol struct with info and adapters
    mapping (bytes32 => ProtocolMetadata) internal protocolMetadata;
    // protocol name => array of protocol adapters
    mapping (bytes32 => address[]) internal protocolAdapters;
    // protocol adapter => array of supported tokens
    mapping (address => address[]) internal supportedTokens;

    /**
     * @notice Initializes contract storage.
     */
    constructor() internal {
        nextProtocolName[INITIAL_PROTOCOL_NAME] = INITIAL_PROTOCOL_NAME;
    }

    /**
     * @notice Adds new protocols.
     * The function is callable only by the owner.
     * @param protocolNames Names of the protocols to be added.
     * @param metadata Array with new protocols metadata.
     * @param adapters Nested arrays with new protocols' adapters.
     * @param tokens Nested arrays with adapters' supported tokens.
     */
    function addProtocols(
        bytes32[] memory protocolNames,
        ProtocolMetadata[] memory metadata,
        address[][] memory adapters,
        address[][][] memory tokens
    )
        public
        onlyOwner
    {
        require(protocolNames.length == metadata.length, "PM: names & metadata differ!");
        require(protocolNames.length == adapters.length, "PM: names & adapters differ!");
        require(protocolNames.length == tokens.length, "PM: names & tokens differ!");
        require(protocolNames.length != 0, "PM: empty!");

        for (uint256 i = 0; i < protocolNames.length; i++) {
            addProtocol(protocolNames[i], metadata[i], adapters[i], tokens[i]);
        }
    }

    /**
     * @notice Removes protocols.
     * The function is callable only by the owner.
     * @param protocolNames Names of the protocols to be removed.
     */
    function removeProtocols(
        bytes32[] memory protocolNames
    )
        public
        onlyOwner
    {
        require(protocolNames.length != 0, "PM: empty!");

        for (uint256 i = 0; i < protocolNames.length; i++) {
            removeProtocol(protocolNames[i]);
        }
    }

    /**
     * @notice Updates a protocol info.
     * The function is callable only by the owner.
     * @param protocolName Name of the protocol to be updated.
     * @param name Name of the protocol to be added instead.
     * @param description Description of the protocol to be added instead.
     * @param websiteURL URL of the protocol website to be added instead.
     * @param iconURL URL of the protocol icon to be added instead.
     */
    function updateProtocolMetadata(
        bytes32 protocolName,
        string memory name,
        string memory description,
        string memory websiteURL,
        string memory iconURL
    )
        public
        onlyOwner
    {
        require(isValidProtocol(protocolName), "PM: bad name!");
        require(abi.encodePacked(name, description, websiteURL, iconURL).length != 0, "PM: empty!");

        ProtocolMetadata storage metadata = protocolMetadata[protocolName];

        if (bytes(name).length != 0) {
            metadata.name = name;
        }

        if (bytes(description).length != 0) {
            metadata.description = description;
        }

        if (bytes(websiteURL).length != 0) {
            metadata.websiteURL = websiteURL;
        }

        if (bytes(iconURL).length != 0) {
            metadata.iconURL = iconURL;
        }

        metadata.version++;
    }

    /**
     * @notice Adds protocol adapters.
     * The function is callable only by the owner.
     * @param protocolName Name of the protocol to be updated.
     * @param adapters Array of new adapters to be added.
     * @param tokens Array of new adapters' supported tokens.
     */
    function addProtocolAdapters(
        bytes32 protocolName,
        address[] memory adapters,
        address[][] memory tokens
    )
        public
        onlyOwner
    {
        require(isValidProtocol(protocolName), "PM: bad name!");
        require(adapters.length != 0, "PM: empty!");

        for (uint256 i = 0; i < adapters.length; i++) {
            addProtocolAdapter(protocolName, adapters[i], tokens[i]);
        }

        protocolMetadata[protocolName].version++;
    }

    /**
     * @notice Removes protocol adapters.
     * The function is callable only by the owner.
     * @param protocolName Name of the protocol to be updated.
     * @param adapterIndices Array of adapter indexes to be removed.
     * @dev NOTE: indexes will change during execution of this function!!!
     */
    function removeProtocolAdapters(
        bytes32 protocolName,
        uint256[] memory adapterIndices
    )
        public
        onlyOwner
    {
        require(isValidProtocol(protocolName), "PM: bad name!");
        require(adapterIndices.length != 0, "PM: empty!");

        for (uint256 i = 0; i < adapterIndices.length; i++) {
            removeProtocolAdapter(protocolName, adapterIndices[i]);
        }

        protocolMetadata[protocolName].version++;
    }

    /**
     * @notice Updates a protocol adapter.
     * The function is callable only by the owner.
     * @param protocolName Name of the protocol to be updated.
     * @param index Index of the adapter to be updated.
     * @param newAdapterAddress New adapter address to be added instead.
     * @param newSupportedTokens New supported tokens to be added instead.
     */
    function updateProtocolAdapter(
        bytes32 protocolName,
        uint256 index,
        address newAdapterAddress,
        address[] memory newSupportedTokens
    )
        public
        onlyOwner
    {
        require(isValidProtocol(protocolName), "PM: bad name!");
        require(index < protocolAdapters[protocolName].length, "PM: bad index!");
        require(newAdapterAddress != address(0), "PM: empty!");

        address adapterAddress = protocolAdapters[protocolName][index];

        if (newAdapterAddress == adapterAddress) {
            supportedTokens[adapterAddress] = newSupportedTokens;
        } else {
            protocolAdapters[protocolName][index] = newAdapterAddress;
            supportedTokens[newAdapterAddress] = newSupportedTokens;
            delete supportedTokens[adapterAddress];
        }

        protocolMetadata[protocolName].version++;
    }

    /**
     * @return Array of protocol names.
     */
    function getProtocolNames()
        public
        view
        returns (bytes32[] memory)
    {
        uint256 counter = 0;
        bytes32 currentProtocolName = nextProtocolName[INITIAL_PROTOCOL_NAME];

        while (currentProtocolName != INITIAL_PROTOCOL_NAME) {
            currentProtocolName = nextProtocolName[currentProtocolName];
            counter++;
        }

        bytes32[] memory protocolNames = new bytes32[](counter);
        counter = 0;
        currentProtocolName = nextProtocolName[INITIAL_PROTOCOL_NAME];

        while (currentProtocolName != INITIAL_PROTOCOL_NAME) {
            protocolNames[counter] = currentProtocolName;
            currentProtocolName = nextProtocolName[currentProtocolName];
            counter++;
        }

        return protocolNames;
    }

    /**
     * @param protocolName Name of the protocol.
     * @return Metadata of the protocol.
     */
    function getProtocolMetadata(
        bytes32 protocolName
    )
        public
        view
        returns (ProtocolMetadata memory)
    {
        return (protocolMetadata[protocolName]);
    }

    /**
     * @param protocolName Name of the protocol.
     * @return Array of protocol adapters.
     */
    function getProtocolAdapters(
        bytes32 protocolName
    )
        public
        view
        returns (address[] memory)
    {
        return protocolAdapters[protocolName];
    }

    /**
     * @param adapter Address of the protocol adapter.
     * @return Array of supported tokens.
     */
    function getSupportedTokens(
        address adapter
    )
        public
        view
        returns (address[] memory)
    {
        return supportedTokens[adapter];
    }

    /**
     * @param protocolName Name of the protocol.
     * @return Whether the protocol name is valid.
     */
    function isValidProtocol(
        bytes32 protocolName
    )
        public
        view
        returns (bool)
    {
        return nextProtocolName[protocolName] != bytes32(0) && protocolName != INITIAL_PROTOCOL_NAME;
    }

    /**
     * @notice Adds a new protocol.
     * The function is callable only by the owner.
     * @param protocolName Name of the protocol to be added.
     * @param metadata Info about new protocol.
     * @param adapters Addresses of new protocol's adapters.
     * @param tokens Addresses of new protocol's adapters' supported tokens.
     */
    function addProtocol(
        bytes32 protocolName,
        ProtocolMetadata memory metadata,
        address[] memory adapters,
        address[][] memory tokens
    )
        internal
    {
        require(protocolName != INITIAL_PROTOCOL_NAME, "PM: initial name!");
        require(protocolName != bytes32(0), "PM: empty name!");
        require(nextProtocolName[protocolName] == bytes32(0), "PM: name exists!");
        require(adapters.length == tokens.length, "PM: adapters & tokens differ!");

        nextProtocolName[protocolName] = nextProtocolName[INITIAL_PROTOCOL_NAME];
        nextProtocolName[INITIAL_PROTOCOL_NAME] = protocolName;

        protocolMetadata[protocolName] = ProtocolMetadata({
            name: metadata.name,
            description: metadata.description,
            websiteURL: metadata.websiteURL,
            iconURL: metadata.iconURL,
            version: metadata.version
        });

        for (uint256 i = 0; i < adapters.length; i++) {
            addProtocolAdapter(protocolName, adapters[i], tokens[i]);
        }
    }

    /**
     * @notice Removes one of the protocols.
     * @param protocolName Name of the protocol to be removed.
     */
    function removeProtocol(
        bytes32 protocolName
    )
        internal
    {
        require(isValidProtocol(protocolName), "PM: bad name!");

        bytes32 prevProtocolName;
        bytes32 currentProtocolName = nextProtocolName[protocolName];
        while (currentProtocolName != protocolName) {
            prevProtocolName = currentProtocolName;
            currentProtocolName = nextProtocolName[currentProtocolName];
        }

        delete protocolMetadata[protocolName];

        nextProtocolName[prevProtocolName] = nextProtocolName[protocolName];
        delete nextProtocolName[protocolName];

        uint256 length = protocolAdapters[protocolName].length;
        for (uint256 i = length - 1; i < length; i--) {
            removeProtocolAdapter(protocolName, i);
        }
    }

    /**
     * @notice Adds a protocol adapter.
     * The function is callable only by the owner.
     * @param protocolName Name of the protocol to be updated.
     * @param adapter New adapter to be added.
     * @param tokens New adapter's supported tokens.
     */
    function addProtocolAdapter(
        bytes32 protocolName,
        address adapter,
        address[] memory tokens
    )
        internal
    {
        if (adapter == address(0)) {
            require(tokens.length == 0, "PM: tokens for zero adapter!");
        }
        require(supportedTokens[adapter].length == 0, "PM: exists!");

        protocolAdapters[protocolName].push(adapter);
        supportedTokens[adapter] = tokens;
    }

    /**
     * @notice Removes a protocol adapter.
     * The function is callable only by the owner.
     * @param protocolName Name of the protocol to be updated.
     * @param index Adapter index to be removed.
     */
    function removeProtocolAdapter(
        bytes32 protocolName,
        uint256 index
    )
        internal
    {
        uint256 length = protocolAdapters[protocolName].length;
        require(index < length, "PM: bad index!");

        delete supportedTokens[protocolAdapters[protocolName][index]];

        if (index != length - 1) {
            protocolAdapters[protocolName][index] = protocolAdapters[protocolName][length - 1];
        }

        protocolAdapters[protocolName].pop();
    }
}
