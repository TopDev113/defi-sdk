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

pragma solidity 0.7.1;
pragma experimental ABIEncoderV2;

import { Ownable } from "./Ownable.sol";

/**
 * @title TokenAdapterRegistry part responsible for token adapters management.
 * @dev Base contract for TokenAdapterRegistry.
 * @author Igor Sobolev <sobolev@zerion.io>
 */
abstract contract TokenAdapterManager is Ownable {
    // Token adapters' names
    bytes32[] internal _tokenAdapterNames;
    // Token adapter's name => token adapter's address
    mapping(bytes32 => address) internal _tokenAdapterAddress;

    /**
     * @notice Adds token adapters.
     * The function is callable only by the owner.
     * @param newTokenAdapterNames Array of the new token adapters' names.
     * @param newTokenAdapterAddresses Array of the new token adapters' addresses.
     */
    function addTokenAdapters(
        bytes32[] calldata newTokenAdapterNames,
        address[] calldata newTokenAdapterAddresses
    ) external onlyOwner {
        uint256 length = newTokenAdapterNames.length;
        require(length != 0, "TAM: empty[1]");
        require(length == newTokenAdapterAddresses.length, "TAM: lengths differ[1]");

        for (uint256 i = 0; i < length; i++) {
            addTokenAdapter(newTokenAdapterNames[i], newTokenAdapterAddresses[i]);
        }
    }

    /**
     * @notice Removes token adapters.
     * The function is callable only by the owner.
     * @param tokenAdapterNames Array of the token adapters' names.
     */
    function removeTokenAdapters(bytes32[] calldata tokenAdapterNames) external onlyOwner {
        uint256 length = tokenAdapterNames.length;
        require(length != 0, "TAM: empty[2]");

        for (uint256 i = 0; i < length; i++) {
            removeTokenAdapter(tokenAdapterNames[i]);
        }
    }

    /**
     * @notice Updates token adapters.
     * The function is callable only by the owner.
     * @param tokenAdapterNames Array of the token adapters' names.
     * @param newTokenAdapterAddresses Array of the token adapters' new addresses.
     */
    function updateTokenAdapters(
        bytes32[] calldata tokenAdapterNames,
        address[] calldata newTokenAdapterAddresses
    ) external onlyOwner {
        uint256 length = tokenAdapterNames.length;
        require(length != 0, "TAM: empty[3]");
        require(length == newTokenAdapterAddresses.length, "TAM: lengths differ[2]");

        for (uint256 i = 0; i < length; i++) {
            updateTokenAdapter(tokenAdapterNames[i], newTokenAdapterAddresses[i]);
        }
    }

    /**
     * @return Array of token adapter's names.
     */
    function getTokenAdapterNames() external view returns (bytes32[] memory) {
        return _tokenAdapterNames;
    }

    /**
     * @param tokenAdapterName Token adapter's name.
     * @return Address of token adapter.
     */
    function getTokenAdapterAddress(bytes32 tokenAdapterName) external view returns (address) {
        return _tokenAdapterAddress[tokenAdapterName];
    }

    /**
     * @notice Adds a token adapter.
     * @param newTokenAdapterName New token adapter's name.
     * @param newTokenAdapterAddress New token adapter's address.
     */
    function addTokenAdapter(bytes32 newTokenAdapterName, address newTokenAdapterAddress)
        internal
    {
        require(newTokenAdapterAddress != address(0), "TAM: zero[2]");
        require(_tokenAdapterAddress[newTokenAdapterName] == address(0), "TAM: exists");

        _tokenAdapterNames.push(newTokenAdapterName);
        _tokenAdapterAddress[newTokenAdapterName] = newTokenAdapterAddress;
    }

    /**
     * @notice Removes a token adapter.
     * @param tokenAdapterName Token adapter's name.
     */
    function removeTokenAdapter(bytes32 tokenAdapterName) internal {
        require(_tokenAdapterAddress[tokenAdapterName] != address(0), "TAM: does not exist[1]");

        uint256 length = _tokenAdapterNames.length;
        uint256 index = 0;
        while (_tokenAdapterNames[index] != tokenAdapterName) {
            index++;
        }

        if (index != length - 1) {
            _tokenAdapterNames[index] = _tokenAdapterNames[length - 1];
        }

        _tokenAdapterNames.pop();

        delete _tokenAdapterAddress[tokenAdapterName];
    }

    /**
     * @notice Updates a token adapter.
     * @param tokenAdapterName Token adapter's name.
     * @param newTokenAdapterAddress Token adapter's new address.
     */
    function updateTokenAdapter(bytes32 tokenAdapterName, address newTokenAdapterAddress)
        internal
    {
        address oldTokenAdapterAddress = _tokenAdapterAddress[tokenAdapterName];
        require(oldTokenAdapterAddress != address(0), "TAM: does not exist[2]");
        require(newTokenAdapterAddress != address(0), "TAM: zero[3]");
        require(oldTokenAdapterAddress != newTokenAdapterAddress, "TAM: same addresses");

        _tokenAdapterAddress[tokenAdapterName] = newTokenAdapterAddress;
    }
}
