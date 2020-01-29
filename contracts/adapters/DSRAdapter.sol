pragma solidity 0.6.1;
pragma experimental ABIEncoderV2;

import { Adapter } from "./Adapter.sol";
import { Component } from "../Structs.sol";


/**
 * @dev Pot contract interface.
 * Only the functions required for DSRAdapter contract are added.
 * The Pot contract is available here
 * https://github.com/makerdao/dss/blob/master/src/pot.sol.
 */
interface Pot {
    function pie(address) external view returns(uint256);
    function dsr() external view returns(uint256);
    function rho() external view returns(uint256);
    function chi() external view returns(uint256);
}


/**
 * @title Adapter for DSR protocol.
 * @dev Implementation of Adapter abstract contract.
 */
contract DSRAdapter is Adapter {

    address constant internal POT = 0x197E90f9FAD81970bA7976f33CbD77088E5D7cf7;
    uint256 constant internal ONE = 10 ** 27;

    /**
     * @return Name of the protocol.
     * @dev Implementation of Adapter function.
     */
    function getProtocolName() external pure override returns (string memory) {
        return("DSR");
    }

    /**
     * @return Amount of DAI locked on the protocol by the given user.
     * @dev Implementation of Adapter function.
     * This function repeats the calculations made in drip() function of Pot contract.
     */
    function getAssetAmount(address, address user) external view override returns (int128) {
        Pot pot = Pot(POT);
        // solhint-disable-next-line not-rely-on-time
        uint256 chi = rmultiply(rpower(pot.dsr(), now - pot.rho(), ONE), pot.chi());
        return int128(rmultiply(chi, pot.pie(user)));
    }

    /**
     * @return Struct with underlying assets rates for the given asset.
     * @dev Implementation of Adapter function.
     */
    function getUnderlyingRates(address asset) external view override returns (Component[] memory) {
        Component[] memory components = new Component[](1);

        components[0] = Component({
            underlying: asset,
            rate: uint256(1e18)
        });

        return components;
    }

    /**
     * @dev The function was copied from Pot contract in order to repeat computations.
     * The Pot contract is available here
     * https://github.com/makerdao/dss/blob/master/src/pot.sol.
     */
    function rpower(uint x, uint n, uint base) internal pure returns (uint z) {
        assembly {
            switch x case 0 {switch n case 0 {z := base} default {z := 0}}
            default {
                switch mod(n, 2) case 0 { z := base } default { z := x }
                let half := div(base, 2)  // for rounding.
                for { n := div(n, 2) } n { n := div(n,2) } {
                let xx := mul(x, x)
                if iszero(eq(div(xx, x), x)) { revert(0,0) }
                let xxRound := add(xx, half)
                if lt(xxRound, xx) { revert(0,0) }
                x := div(xxRound, base)
                if mod(n,2) {
                    let zx := mul(z, x)
                    if and(iszero(iszero(x)), iszero(eq(div(zx, x), z))) { revert(0,0) }
                    let zxRound := add(zx, half)
                    if lt(zxRound, zx) { revert(0,0) }
                    z := div(zxRound, base)
                }
            }
            }
        }
    }

    /**
     * @dev The function was copied from Pot contract in order to repeat computations.
     * The function was renamed from rmul() in order to silence the compiler.
     * The Pot contract is available here
     * https://github.com/makerdao/dss/blob/master/src/pot.sol.
     */
    function rmultiply(uint x, uint y) internal pure returns (uint z) {
        z = multiply(x, y) / ONE;
    }

    /**
     * @dev The function was copied from Pot contract in order to repeat computations.
     * The function was renamed from mul() in order to silence the compiler.
     * The Pot contract is available here
     * https://github.com/makerdao/dss/blob/master/src/pot.sol.
     */
    function multiply(uint x, uint y) internal pure returns (uint z) {
        require(y == 0 || (z = x * y) / y == x);
    }
}
