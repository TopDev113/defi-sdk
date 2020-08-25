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

import { TransactionData, Action, Input, Fee, Output, AmountType } from "../shared/Structs.sol";
import { ERC20 } from "../shared/ERC20.sol";
import { SafeERC20 } from "../shared/SafeERC20.sol";
import { SignatureVerifier } from "./SignatureVerifier.sol";
import { Ownable } from "./Ownable.sol";
import { Core } from "./Core.sol";


interface GST2 {
    function freeUpTo(uint256) external;
}


contract Router is SignatureVerifier("Zerion Router"), Ownable {
    using SafeERC20 for ERC20;

    address internal immutable core_;

    address internal constant GAS_TOKEN = 0x0000000000b3F879cb30FE243b4Dfee438691c04;
    address internal constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    uint256 internal constant DELIMITER = 1e18; // 100%
    uint256 internal constant FEE_LIMIT = 1e16; // 1%

    constructor(address payable core) public {
        require(core != address(0), "R: empty core!");
        core_ = core;
    }

    function returnLostTokens(
        ERC20 token,
        address payable beneficiary
    )
        external
        onlyOwner
    {
        token.safeTransfer(beneficiary, token.balanceOf(address(this)), "R!");

        uint256 ethBalance = address(this).balance;
        if (ethBalance > 0) {
            beneficiary.transfer(ethBalance);
        }
    }

    function getRequiredAllowances(
        Input[] calldata inputs,
        address account
    )
        external
        view
        returns (Output[] memory)
    {
        uint256 length = inputs.length;
        Output[] memory requiredAllowances = new Output[](length);
        uint256 required;
        uint256 current;

        for (uint256 i = 0; i < length; i++) {
            required = getAbsoluteAmount(inputs[i], account);
            current = ERC20(inputs[i].token).allowance(account, address(this));

            requiredAllowances[i] = Output({
                token: inputs[i].token,
                amount: required > current ? required - current : 0
            });
        }

        return requiredAllowances;
    }

    function getRequiredBalances(
        Input[] calldata inputs,
        address account
    )
        external
        view
        returns (Output[] memory)
    {
        uint256 length = inputs.length;
        Output[] memory requiredBalances = new Output[](length);
        uint256 required;
        uint256 current;

        for (uint256 i = 0; i < length; i++) {
            required = getAbsoluteAmount(inputs[i], account);
            current = ERC20(inputs[i].token).balanceOf(account);

            requiredBalances[i] = Output({
                token: inputs[i].token,
                amount: required > current ? required - current : 0
            });
        }

        return requiredBalances;
    }

    /**
     * @return Address of the Core contract used.
     */
    function core()
        external
        view
        returns (address)
    {
        return core_;
    }

    function startExecution(
        TransactionData memory data,
        bytes memory signature
    )
        public
        payable
        returns (Output[] memory)
    {
        address payable account = getAccountFromSignature(data, signature);

        updateNonce(account);

        return startExecution(
            data.actions,
            data.inputs,
            data.fee,
            data.requiredOutputs,
            account
        );
    }

    function startExecution(
        Action[] memory actions,
        Input[] memory inputs,
        Fee memory fee,
        Output[] memory requiredOutputs
    )
        public
        payable
        returns (Output[] memory)
    {
        return startExecution(
            actions,
            inputs,
            fee,
            requiredOutputs,
            msg.sender
        );
    }

    function startExecution(
        Action[] memory actions,
        Input[] memory inputs,
        Fee memory fee,
        Output[] memory requiredOutputs,
        address payable account
    )
        internal
        returns (Output[] memory)
    {
        // save initial gas to burn gas token later
        uint256 gas = gasleft();
        // transfer tokens to core_, handle fees (if any), and add these tokens to outputs
        transferTokens(inputs, fee, account);
        Output[] memory modifiedOutputs = modifyOutputs(requiredOutputs, inputs);
        // call Core contract with all provided ETH, actions, expected outputs and account address
        Output[] memory actualOutputs = Core(core_).executeActions(
            actions,
            modifiedOutputs,
            account
        );
        // try to burn gas token to save some gas
        freeGasToken(gas - gasleft());

        return actualOutputs;
    }

    function transferTokens(
        Input[] memory inputs,
        Fee memory fee,
        address account
    )
        internal
    {
        uint256 absoluteAmount;
        uint256 feeAmount;

        if (fee.share > 0) {
            require(fee.beneficiary != address(0), "R: bad beneficiary!");
            require(fee.share <= FEE_LIMIT, "R: bad fee!");
        }

        for (uint256 i = 0; i < inputs.length; i++) {
            absoluteAmount = getAbsoluteAmount(inputs[i], account);
            require(absoluteAmount > 0, "R: zero amount!");

            feeAmount = mul(absoluteAmount, fee.share) / DELIMITER;

            if (feeAmount > 0) {
                ERC20(inputs[i].token).safeTransferFrom(
                    account,
                    fee.beneficiary,
                    feeAmount,
                    "R![1]"
                );
            }

            ERC20(inputs[i].token).safeTransferFrom(
                account,
                address(core_),
                absoluteAmount - feeAmount,
                "R![2]"
            );
        }

        feeAmount = mul(address(this).balance, fee.share) / DELIMITER;

        if (feeAmount > 0) {
            // solhint-disable-next-line avoid-low-level-calls
            (bool success, ) = fee.beneficiary.call{value: feeAmount}(new bytes(0));
            require(success, "ETH transfer to beneficiary failed!");
        }
    }

    function freeGasToken(
        uint256 desiredAmount
    )
        internal
    {
        uint256 safeAmount = 0;
        uint256 gas = gasleft();

        if (gas >= 27710) {
            safeAmount = (gas - 27710) / 7020; // 1148 + 5722 + 150
        }

        if (desiredAmount > safeAmount) {
            desiredAmount = safeAmount;
        }

        if (desiredAmount > 0) {
            GST2(GAS_TOKEN).freeUpTo(desiredAmount);
        }
    }

    function getAbsoluteAmount(
        Input memory input,
        address account
    )
        internal
        view
        returns (uint256)
    {
        address token = input.token;
        AmountType amountType = input.amountType;
        uint256 amount = input.amount;

        require(
            amountType == AmountType.Relative || amountType == AmountType.Absolute,
            "R: bad amount type!"
        );

        if (amountType == AmountType.Relative) {
            require(amount <= DELIMITER, "R: bad amount!");
            if (amount == DELIMITER) {
                return ERC20(token).balanceOf(account);
            } else {
                return mul(ERC20(token).balanceOf(account), amount) / DELIMITER;
            }
        } else {
            return amount;
        }
    }

    function modifyOutputs(
        Output[] memory requiredOutputs,
        Input[] memory inputs
    )
        internal
        view
        returns (Output[] memory)
    {
        uint256 ethInput = msg.value > 0 ? 1 : 0;
        Output[] memory modifiedOutputs = new Output[](
            requiredOutputs.length + inputs.length + ethInput
        );

        for (uint256 i = 0; i < requiredOutputs.length; i++) {
            modifiedOutputs[i] = requiredOutputs[i];
        }

        for (uint256 i = 0; i < inputs.length; i++) {
            modifiedOutputs[requiredOutputs.length + i] = Output({
                token: inputs[i].token,
                amount: 0
            });
        }

        if (ethInput > 0) {
            modifiedOutputs[requiredOutputs.length + inputs.length] = Output({
                token: ETH,
                amount: 0
            });
        }

        return modifiedOutputs;
    }

    function mul(
        uint256 a,
        uint256 b
    )
        internal
        pure
        returns (uint256)
    {
        if (a == 0) {
            return 0;
        }

        uint256 c = a * b;
        require(c / a == b, "R: mul overflow");

        return c;
    }
}
