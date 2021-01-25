import expectRevert from '../helpers/expectRevert';
import convertToShare from '../helpers/convertToShare';
import convertToBytes32 from '../helpers/convertToBytes32';
import signTypedData from '../helpers/signTypedData';

const { BN } = web3.utils;

const ACTION_DEPOSIT = 1;
const ACTION_WITHDRAW = 2;
const AMOUNT_RELATIVE = 1;
const AMOUNT_ABSOLUTE = 2;
const EMPTY_BYTES = '0x';
const FUTURE_TIMESTAMP = 1893456000;
const UNISWAP_FACTORY = 1;

const ZERO = '0x0000000000000000000000000000000000000000';

const ProtocolAdapterRegistry = artifacts.require('./ProtocolAdapterRegistry');
const InteractiveAdapter = artifacts.require('./MockInteractiveAdapter');
const Core = artifacts.require('./Core');
const Router = artifacts.require('./Router');
const ERC20 = artifacts.require('./ERC20');
const IDAI = artifacts.require('./DAI');
const IUSDC = artifacts.require('./EIP2612');
const WETH9 = artifacts.require('./WETH9');

contract.only('Core + Router', () => {
  const wethAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  const ethAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
  const daiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
  const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

  let accounts;
  let core;
  let router;
  let protocolAdapterRegistry;
  let protocolAdapterAddress;
  let sign;
  let signature;
  let daiAmount;
  let wethAmount;
  let usdcAmount;
  let DAI;
  let USDC;
  let WETH;

  describe('Core and Router tests using Mock', async () => {
    beforeEach(async () => {
      accounts = await web3.eth.getAccounts();
      await InteractiveAdapter.new({ from: accounts[0] })
        .then((result) => {
          protocolAdapterAddress = result.address;
        });
      await ProtocolAdapterRegistry.new({ from: accounts[0] })
        .then((result) => {
          protocolAdapterRegistry = result.contract;
        });
      await protocolAdapterRegistry.methods.addProtocolAdapters(
        [convertToBytes32('Mock')],
        [
          protocolAdapterAddress,
        ],
        [[]],
      )
        .send({
          from: accounts[0],
          gas: '1000000',
        });
      await Core.new(
        protocolAdapterRegistry.options.address,
        { from: accounts[0] },
      )
        .then((result) => {
          core = result.contract;
        });
      await Router.new(
        core.options.address,
        { from: accounts[0] },
      )
        .then((result) => {
          router = result.contract;
        });
      await ERC20.at(wethAddress)
        .then((result) => {
          WETH = result.contract;
        });
      await ERC20.at(daiAddress)
        .then((result) => {
          DAI = result.contract;
        });
      await ERC20.at(usdcAddress)
        .then((result) => {
          USDC = result.contract;
        });
      await WETH9.at(wethAddress)
        .then((result) => {
          result.contract.methods.deposit()
            .send({
              from: accounts[0],
              value: web3.utils.toWei('1', 'ether'),
              gas: 1000000,
            });
        });
      await router.methods.swapExactETHForTokens(
        [
          0,
          ZERO,
        ],
        UNISWAP_FACTORY,
        0,
        [wethAddress, daiAddress],
        accounts[0],
        FUTURE_TIMESTAMP,
      )
        .send({
          from: accounts[0],
          value: web3.utils.toWei('0.1', 'ether'),
          gas: 10000000,
        })
        .then((receipt) => {
          console.log(`called router for ${receipt.cumulativeGasUsed} gas`);
        });
      await router.methods.swapExactETHForTokens(
        [
          0,
          ZERO,
        ],
        UNISWAP_FACTORY,
        0,
        [wethAddress, usdcAddress],
        accounts[0],
        FUTURE_TIMESTAMP,
      )
        .send({
          from: accounts[0],
          value: web3.utils.toWei('0.1', 'ether'),
          gas: 10000000,
        })
        .then((receipt) => {
          console.log(`called router for ${receipt.cumulativeGasUsed} gas`);
        });
    });

    it('should not deploy router with no core', async () => {
      await expectRevert(Router.new(
        ZERO,
        { from: accounts[0] },
      ));
    });

    it('should be correct core', async () => {
      await router.methods.getCore()
        .call()
        .then((result) => {
          assert.equal(result, core.options.address);
        });
    });

    it('should be correct adapter registry', async () => {
      await core.methods.getProtocolAdapterRegistry()
        .call()
        .then((result) => {
          assert.equal(result, protocolAdapterRegistry.options.address);
        });
    });

    it('should not deploy core with no registry', async () => {
      await expectRevert(Core.new(
        ZERO,
        { from: accounts[0] },
      ));
    });

    it('should not execute action with wrong name', async () => {
      await expectRevert(router.methods.execute(
        // actions
        [
          [
            convertToBytes32('Mock1'),
            ACTION_DEPOSIT,
            [],
            EMPTY_BYTES,
          ],
        ],
        // inputs
        [],
        // fee
        [
          0,
          ZERO,
        ],
        // outputs
        [],
      )
        .send({
          from: accounts[0],
          gas: 10000000,
          value: web3.utils.toWei('1', 'ether'),
        }));
    });

    it('should not execute action with too large requirement', async () => {
      await expectRevert(router.methods.execute(
        // actions
        [
          [
            convertToBytes32('Mock'),
            ACTION_DEPOSIT,
            [],
            EMPTY_BYTES,
          ],
        ],
        // inputs
        [],
        // fee
        [
          0,
          ZERO,
        ],
        // outputs
        [
          [wethAddress, web3.utils.toWei('2', 'ether')],
        ],
      )
        .send({
          from: accounts[0],
          gas: 10000000,
          value: web3.utils.toWei('1', 'ether'),
        }));
    });

    it('should not execute action (on core) with zero action type', async () => {
      await expectRevert(core.methods.executeActions(
        // actions
        [
          [
            convertToBytes32('Mock'),
            0,
            [],
            EMPTY_BYTES,
          ],
        ],
        // outputs
        [],
        accounts[0],
      )
        .send({
          from: accounts[0],
          gas: 10000000,
          value: web3.utils.toWei('1', 'ether'),
        }));
    });

    it('should not execute action (on core) with zero account', async () => {
      await expectRevert(core.methods.executeActions(
        // actions
        [
          [
            convertToBytes32('Mock'),
            ACTION_DEPOSIT,
            [],
            EMPTY_BYTES,
          ],
        ],
        // outputs
        [],
        ZERO,
      )
        .send({
          from: accounts[0],
          gas: 10000000,
          value: web3.utils.toWei('1', 'ether'),
        }));
    });

    it('should execute deposit action (+ execute with CHI)', async () => {
      await router.methods.execute(
        // actions
        [
          [
            convertToBytes32('Mock'),
            ACTION_DEPOSIT,
            [],
            EMPTY_BYTES,
          ],
        ],
        // inputs
        [],
        // fee
        [
          0,
          ZERO,
        ],
        // outputs
        [],
      )
        .send({
          from: accounts[0],
          gas: 10000000,
          value: web3.utils.toWei('1', 'ether'),
        });
      await router.methods.executeWithCHI(
        // actions
        [
          [
            convertToBytes32('Mock'),
            ACTION_DEPOSIT,
            [],
            EMPTY_BYTES,
          ],
        ],
        // inputs
        [],
        // fee
        [
          0,
          ZERO,
        ],
        // outputs
        [],
      )
        .send({
          from: accounts[0],
          gas: 10000000,
          value: web3.utils.toWei('1', 'ether'),
        });
    });

    it('should execute withdraw action', async () => {
      await web3.eth.sendTransaction({ to: wethAddress, from: accounts[0], value: 1 });
      await WETH.methods.approve(router.options.address, 1)
        .send({
          from: accounts[0],
          gas: 1000000,
        });
      await router.methods.execute(
        // actions
        [
          [
            convertToBytes32('Mock'),
            ACTION_WITHDRAW,
            [],
            EMPTY_BYTES,
          ],
        ],
        // inputs
        [
          [
            [wethAddress, 1, AMOUNT_ABSOLUTE],
            [0, EMPTY_BYTES],
          ],
        ],
        // fee
        [
          0,
          ZERO,
        ],
        // outputs
        [],
      )
        .send({
          from: accounts[0],
          gas: 10000000,
        });
    });

    it('should not execute withdraw action if no allowance/permit', async () => {
      await web3.eth.sendTransaction({ to: wethAddress, from: accounts[0], value: 1 });

      await expectRevert(router.methods.execute(
        // actions
        [
          [
            convertToBytes32('Mock'),
            ACTION_WITHDRAW,
            [],
            EMPTY_BYTES,
          ],
        ],
        // inputs
        [
          [
            [wethAddress, 1, AMOUNT_ABSOLUTE],
            [0, EMPTY_BYTES],
          ],
        ],
        // fee
        [
          0,
          ZERO,
        ],
        // outputs
        [],
      )
        .send({
          from: accounts[0],
          gas: 10000000,
        }));
    });

    it('should not execute withdraw action with too large relative amount', async () => {
      let wethBalance;
      await WETH.methods.balanceOf(accounts[0])
        .call()
        .then((result) => {
          wethBalance = result;
        });
      await WETH.methods.approve(router.options.address, wethBalance)
        .send({
          from: accounts[0],
          gas: 1000000,
        });
      await expectRevert(router.methods.execute(
        // actions
        [
          [
            convertToBytes32('Mock'),
            ACTION_WITHDRAW,
            [],
            EMPTY_BYTES,
          ],
        ],
        // inputs
        [
          [
            [wethAddress, web3.utils.toWei('1.1', 'ether'), AMOUNT_RELATIVE],
            [0, EMPTY_BYTES],
          ],
        ],
        // fee
        [
          0,
          ZERO,
        ],
        // outputs
        [],
      )
        .send({
          from: accounts[0],
          gas: 10000000,
        }));
    });

    it('should not execute withdraw action with bad amount type', async () => {
      let wethBalance;
      await WETH.methods.balanceOf(accounts[0])
        .call()
        .then((result) => {
          wethBalance = result;
        });
      await WETH.methods.approve(router.options.address, wethBalance)
        .send({
          from: accounts[0],
          gas: 1000000,
        });
      await expectRevert(router.methods.execute(
        // actions
        [
          [
            convertToBytes32('Mock'),
            ACTION_WITHDRAW,
            [],
            EMPTY_BYTES,
          ],
        ],
        // inputs
        [
          [
            [wethAddress, web3.utils.toWei('1', 'ether'), 0],
            [0, EMPTY_BYTES],
          ],
        ],
        // fee
        [
          0,
          ZERO,
        ],
        // outputs
        [],
      )
        .send({
          from: accounts[0],
          gas: 10000000,
        }));
    });

    it('should return lost tokens', async () => {
      await web3.eth.sendTransaction({ to: wethAddress, from: accounts[0], value: 1 });
      await WETH.methods.transfer(router.options.address, 1)
        .send({
          from: accounts[0],
          gas: 1000000,
        });
      await WETH.methods.balanceOf(router.options.address)
        .call()
        .then((result) => {
          assert.equal(result, 1);
        });
      await router.methods.returnLostTokens(wethAddress, accounts[0])
        .send({
          from: accounts[0],
          gas: 1000000,
        });
      await WETH.methods.balanceOf(router.options.address)
        .call()
        .then((result) => {
          assert.equal(result, 0);
        });
    });

    it('should not return lost tokens if receiver cannot receive', async () => {
      await router.methods.returnLostTokens(ethAddress, accounts[0])
        .send({
          from: accounts[0],
          gas: 1000000,
        });
      await expectRevert(router.methods.returnLostTokens(ethAddress, protocolAdapterAddress)
        .send({
          from: accounts[0],
          gas: 1000000,
        }));
    });

    it('should not handle large fees correctly', async () => {
      await WETH.methods.approve(router.options.address, web3.utils.toWei('1', 'ether'))
        .send({
          from: accounts[0],
          gas: 1000000,
        });
      await expectRevert(router.methods.execute(
        // actions
        [],
        // inputs
        [
          [
            [
              wethAddress,
              web3.utils.toWei('1', 'ether'),
              AMOUNT_ABSOLUTE,
            ],
            [0, EMPTY_BYTES],
          ],
        ],
        // fee
        [
          web3.utils.toWei('0.011', 'ether'),
          accounts[1],
        ],
        // outputs
        [],
      )
        .send({
          from: accounts[0],
          gas: 10000000,
        }));
    });

    it('should not handle large eth fees correctly', async () => {
      await expectRevert(router.methods.execute(
        // actions
        [],
        // inputs
        [],
        // fee
        [
          web3.utils.toWei('0.011', 'ether'),
          accounts[1],
        ],
        // outputs
        [],
      )
        .send({
          from: accounts[0],
          value: web3.utils.toWei('1', 'ether'),
          gas: 10000000,
        }));
    });

    it('should not accept 0 inputs', async () => {
      await expectRevert(router.methods.execute(
        // actions
        [],
        // inputs
        [
          [
            [
              daiAddress,
              0,
              AMOUNT_ABSOLUTE,
            ],
            [0, EMPTY_BYTES],
          ],
        ],
        // fee
        [
          0,
          ZERO,
        ],
        // outputs
        [],
      )
        .send({
          from: accounts[0],
          gas: 10000000,
        }));
    });

    it('should accept full share input', async () => {
      await WETH.methods['balanceOf(address)'](accounts[0])
        .call()
        .then((result) => {
          wethAmount = result;
        });
      await WETH.methods.approve(router.options.address, wethAmount)
        .send({
          gas: 10000000,
          from: accounts[0],
        });
      await router.methods.execute(
        // actions
        [],
        // inputs
        [
          [
            [
              wethAddress,
              convertToShare(1),
              AMOUNT_RELATIVE,
            ],
            [0, EMPTY_BYTES],
          ],
        ],
        // fee
        [
          0,
          ZERO,
        ],
        // outputs
        [],
      )
        .send({
          from: accounts[0],
          gas: 10000000,
        });
    });

    it('should accept not full share input', async () => {
      await WETH.methods['balanceOf(address)'](accounts[0])
        .call()
        .then((result) => {
          wethAmount = result;
        });
      await WETH.methods.approve(router.options.address, wethAmount)
        .send({
          gas: 10000000,
          from: accounts[0],
        });
      await router.methods.execute(
        // actions
        [],
        // inputs
        [
          [
            [
              wethAddress,
              convertToShare(0.99),
              AMOUNT_RELATIVE,
            ],
            [0, EMPTY_BYTES],
          ],
        ],
        // fee
        [
          0,
          ZERO,
        ],
        // outputs
        [],
      )
        .send({
          from: accounts[0],
          gas: 10000000,
        });
    });

    it('should handle eth fee correctly', async () => {
      let prevBalance;
      await web3.eth.getBalance(accounts[1])
        .then((result) => {
          prevBalance = result;
        });
      await router.methods.execute(
        // actions
        [],
        // inputs
        [],
        // fee
        [
          web3.utils.toWei('0.01', 'ether'),
          accounts[1],
        ],
        // outputs
        [],
      )
        .send({
          from: accounts[0],
          value: web3.utils.toWei('1', 'ether'),
          gas: 10000000,
        });
      await web3.eth.getBalance(accounts[1])
        .then((result) => {
          assert.equal(result, new BN(prevBalance).add(new BN(web3.utils.toWei('0.01', 'ether'))));
        });
    });

    it('should not handle fees to ZERO correctly', async () => {
      await WETH.methods.approve(router.options.address, web3.utils.toWei('1', 'ether'))
        .send({
          from: accounts[0],
          gas: 1000000,
        });
      await expectRevert(router.methods.execute(
        // actions
        [],
        // inputs
        [],
        // fee
        [
          web3.utils.toWei('0.01', 'ether'),
          ZERO,
        ],
        // outputs
        [],
      )
        .send({
          from: accounts[0],
          gas: 10000000,
        }));
    });

    it('should not handle fees to non-receiving address correctly', async () => {
      await expectRevert(router.methods.execute(
        // actions
        [],
        // inputs
        [],
        // fee
        [
          web3.utils.toWei('0.01', 'ether'),
          protocolAdapterAddress,
        ],
        // outputs
        [],
      )
        .send({
          from: accounts[0],
          value: web3.utils.toWei('1', 'ether'),
          gas: 10000000,
        }));
    });

    it('should handle fees correctly', async () => {
      await WETH.methods.approve(router.options.address, web3.utils.toWei('1', 'ether'))
        .send({
          from: accounts[0],
          gas: 1000000,
        });
      let wethBalance;
      await WETH.methods.balanceOf(accounts[1])
        .call()
        .then((result) => {
          wethBalance = new BN(result);
        });
      await router.methods.execute(
        // actions
        [],
        // inputs
        [
          [
            [
              wethAddress,
              web3.utils.toWei('0.1', 'ether'),
              AMOUNT_ABSOLUTE,
            ],
            [0, EMPTY_BYTES],
          ],
        ],
        // fee
        [
          web3.utils.toWei('0.01', 'ether'),
          accounts[1],
        ],
        // outputs
        [],
      )
        .send({
          from: accounts[0],
          gas: 10000000,
        });
      await WETH.methods.balanceOf(accounts[1])
        .call()
        .then((result) => {
          assert.equal((new BN(result)).sub(wethBalance).toString(), web3.utils.toWei('0.001', 'ether'));
        });
    });

    it('should tranfer DAI with permit', async () => {
      sign = async function (permitData) {
        const typedData = {
          types: {
            EIP712Domain: [
              { name: 'name', type: 'string' },
              { name: 'version', type: 'string' },
              { name: 'chainId', type: 'uint256' },
              { name: 'verifyingContract', type: 'address' },
            ],
            Permit: [
              { name: 'holder', type: 'address' },
              { name: 'spender', type: 'address' },
              { name: 'nonce', type: 'uint256' },
              { name: 'expiry', type: 'uint256' },
              { name: 'allowed', type: 'bool' },
            ],
          },
          domain: {
            name: 'Dai Stablecoin',
            version: '1',
            chainId: '1',
            verifyingContract: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
          },
          primaryType: 'Permit',
          message: permitData,
        };

        return signTypedData(accounts[0], typedData);
      };
      signature = await sign(
        {
          holder: accounts[0],
          spender: router.options.address,
          nonce: '0',
          expiry: FUTURE_TIMESTAMP,
          allowed: 'true',
        },
      );
      await DAI.methods['balanceOf(address)'](accounts[0])
        .call()
        .then((result) => {
          daiAmount = result;
          console.log(`dai amount before is  ${web3.utils.fromWei(result, 'ether')}`);
        });
      await IDAI.at(daiAddress)
        .then((result) => {
          DAI = result.contract;
        });
      await router.methods.execute(
        // actions
        [],
        // inputs
        [
          [
            [
              daiAddress,
              daiAmount,
              AMOUNT_ABSOLUTE,
            ],
            [
              2,
              `0x${
                DAI.methods.permit(
                  accounts[0],
                  router.options.address,
                  0,
                  FUTURE_TIMESTAMP,
                  true,
                  web3.utils.hexToNumber(`0x${signature.slice(130, 132)}`),
                  `0x${signature.slice(2, 66)}`,
                  `0x${signature.slice(66, 130)}`,
                ).encodeABI().slice(10) // slice '0x' and first 4 bytes
              }`,
            ],
          ],
        ],
        // fee
        [
          0,
          ZERO,
        ],
        // outputs
        [],
      )
        .send({
          from: accounts[0],
          gas: 10000000,
        })
        .then((receipt) => {
          console.log(`called router for ${receipt.cumulativeGasUsed} gas`);
        });
    });

    it('should tranfer USDC with permit', async () => {
      sign = async function (permitData) {
        const typedData = {
          types: {
            EIP712Domain: [
              { name: 'name', type: 'string' },
              { name: 'version', type: 'string' },
              { name: 'chainId', type: 'uint256' },
              { name: 'verifyingContract', type: 'address' },
            ],
            Permit: [
              { name: 'owner', type: 'address' },
              { name: 'spender', type: 'address' },
              { name: 'value', type: 'uint256' },
              { name: 'nonce', type: 'uint256' },
              { name: 'deadline', type: 'uint256' },
            ],
          },
          domain: {
            name: 'USD Coin',
            version: '2',
            chainId: '1',
            verifyingContract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          },
          primaryType: 'Permit',
          message: permitData,
        };

        return signTypedData(accounts[0], typedData);
      };
      signature = await sign(
        {
          owner: accounts[0],
          spender: router.options.address,
          value: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
          nonce: '0',
          deadline: FUTURE_TIMESTAMP,
        },
      );
      await USDC.methods['balanceOf(address)'](accounts[0])
        .call()
        .then((result) => {
          usdcAmount = result;
          console.log(`usdc amount before is  ${web3.utils.fromWei(new BN(result).muln(10), 'gwei')}`);
        });
      await IUSDC.at(usdcAddress)
        .then((result) => {
          USDC = result.contract;
        });
      await router.methods.execute(
        // actions
        [],
        // inputs
        [
          [
            [
              usdcAddress,
              usdcAmount,
              AMOUNT_ABSOLUTE,
            ],
            [
              1,
              `0x${
                USDC.methods.permit(
                  accounts[0],
                  router.options.address,
                  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
                  FUTURE_TIMESTAMP,
                  web3.utils.hexToNumber(`0x${signature.slice(130, 132)}`),
                  `0x${signature.slice(2, 66)}`,
                  `0x${signature.slice(66, 130)}`,
                ).encodeABI().slice(10) // slice '0x' and first 4 bytes
              }`,
            ],
          ],
        ],
        // fee
        [
          0,
          ZERO,
        ],
        // outputs
        [],
      )
        .send({
          from: accounts[0],
          gas: 10000000,
        })
        .then((receipt) => {
          console.log(`called router for ${receipt.cumulativeGasUsed} gas`);
        });
    });
  });
});
