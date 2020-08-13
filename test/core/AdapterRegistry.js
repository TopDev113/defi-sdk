import expectRevert from '../helpers/expectRevert';

const AdapterRegistry = artifacts.require('./AdapterRegistry');
const ProtocolAdapter = artifacts.require('./MockAdapter');
const TokenAdapter = artifacts.require('./ERC20TokenAdapter');
const CompoundTokenAdapter = artifacts.require('./CompoundTokenAdapter');

const ZERO = '0x0000000000000000000000000000000000000000';
const ONE = '0x1111111111111111111111111111111111111111';
const TWO = '0x2222222222222222222222222222222222222222';

contract.only('AdapterRegistry', () => {
  let accounts;
  let adapterRegistry;
  let protocolAdapterAddress;
  let tokenAdapterAddress;
  let compoundTokenAdapterAddress;

  beforeEach(async () => {
    accounts = await web3.eth.getAccounts();
    await ProtocolAdapter.new({ from: accounts[0] })
      .then((result) => {
        protocolAdapterAddress = result.address;
      });
    await TokenAdapter.new({ from: accounts[0] })
      .then((result) => {
        tokenAdapterAddress = result.address;
      });
    await CompoundTokenAdapter.new({ from: accounts[0] })
      .then((result) => {
        compoundTokenAdapterAddress = result.address;
      });
    await AdapterRegistry.new({ from: accounts[0] })
      .then((result) => {
        adapterRegistry = result.contract;
      });
    await adapterRegistry.methods.addProtocolAdapters(
      [web3.utils.toHex('Mock')],
      [
        protocolAdapterAddress,
      ],
      [
        [protocolAdapterAddress],
      ],
    )
      .send({
        from: accounts[0],
        gas: '1000000',
      });
    await adapterRegistry.methods.addTokenAdapters(
      [web3.utils.toHex('ERC20')],
      [tokenAdapterAddress],
    )
      .send({
        from: accounts[0],
        gas: '1000000',
      });
  });

  it('should be correct owner', async () => {
    await adapterRegistry.methods.owner()
      .call()
      .then((result) => {
        assert.equal(result, accounts[0]);
      });
  });

  it('should be correct pending owner', async () => {
    await adapterRegistry.methods.proposeOwnership(accounts[1])
      .send({
        from: accounts[0],
        gas: '300000',
      });
    await adapterRegistry.methods.pendingOwner()
      .call()
      .then((result) => {
        assert.equal(
          result,
          accounts[1],
        );
      });
  });

  it('should be correct protocols names', async () => {
    await adapterRegistry.methods.getProtocolAdapterNames()
      .call()
      .then((result) => {
        assert.equal(result.length, 1);
        assert.equal(web3.utils.hexToUtf8(result[0]), 'Mock');
      });
  });

  it('should be correct protocol adapters', async () => {
    await adapterRegistry.methods.getProtocolAdapterAddress(web3.utils.toHex('Mock'))
      .call()
      .then((result) => {
        assert.equal(result, protocolAdapterAddress);
      });
  });

  it('should be correct supported tokens', async () => {
    await adapterRegistry.methods.getSupportedTokens(web3.utils.toHex('Mock'))
      .call()
      .then((result) => {
        assert.equal(result.length, 1);
        assert.equal(result[0], protocolAdapterAddress);
      });
  });

  it('should be correct token adapters names', async () => {
    await adapterRegistry.methods.getTokenAdapterNames()
      .call()
      .then((result) => {
        assert.equal(result.length, 1);
        assert.equal(web3.utils.hexToUtf8(result[0]), 'ERC20');
      });
  });

  it('should be correct token adapter', async () => {
    await adapterRegistry.methods.getTokenAdapterAddress(web3.utils.toHex('ERC20'))
      .call()
      .then((result) => {
        assert.equal(result, tokenAdapterAddress);
      });
  });

  it('should not add protocol adapter not by the owner', async () => {
    await expectRevert(adapterRegistry.methods.addProtocolAdapters(
      [
        web3.utils.toHex('Mock2'),
      ],
      [
        protocolAdapterAddress,
      ],
      [
        [protocolAdapterAddress],
      ],
    )
      .send({
        from: accounts[1],
        gas: '300000',
      }));
  });

  it('should not add protocol adapter with bad input (2 names)', async () => {
    await expectRevert(adapterRegistry.methods.addProtocolAdapters(
      [
        web3.utils.toHex('Mock2'),
        web3.utils.toHex('Mock3'),
      ],
      [
        protocolAdapterAddress,
      ],
      [
        [protocolAdapterAddress],
      ],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      }));
  });

  it('should not add protocol adapter with bad input (2 addresses)', async () => {
    await expectRevert(adapterRegistry.methods.addProtocolAdapters(
      [
        web3.utils.toHex('Mock2'),
      ],
      [
        protocolAdapterAddress,
        protocolAdapterAddress,
      ],
      [
        [protocolAdapterAddress],
      ],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      }));
  });

  it('should not add protocol adapter with bad input (2 sets of supported tokens)', async () => {
    await expectRevert(adapterRegistry.methods.addProtocolAdapters(
      [
        web3.utils.toHex('Mock2'),
      ],
      [
        protocolAdapterAddress,
      ],
      [
        [
          protocolAdapterAddress,
        ],
        [
          protocolAdapterAddress,
        ],
      ],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      }));
  });

  it('should not add protocol adapter with empty input', async () => {
    await expectRevert(adapterRegistry.methods.addProtocolAdapters(
      [],
      [],
      [],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      }));
  });

  it('should not add protocol adapter with empty name', async () => {
    await expectRevert(adapterRegistry.methods.addProtocolAdapters(
      ['0x'],
      [
        protocolAdapterAddress,
      ],
      [
        [protocolAdapterAddress],
      ],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      }));
  });

  it('should not add protocol adapter with existing name', async () => {
    await expectRevert(adapterRegistry.methods.addProtocolAdapters(
      [web3.utils.toHex('Mock')],
      [
        protocolAdapterAddress,
      ],
      [
        [protocolAdapterAddress],
      ],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      }));
  });

  it('should not add protocol adapter with zero adapter', async () => {
    await expectRevert(adapterRegistry.methods.addProtocolAdapters(
      [web3.utils.toHex('Mock2')],
      [
        ZERO,
      ],
      [
        [protocolAdapterAddress],
      ],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      }));
  });

  it('should add protocol by the owner', async () => {
    await adapterRegistry.methods.addProtocolAdapters(
      [web3.utils.toHex('Mock2')],
      [
        ONE,
      ],
      [
        [protocolAdapterAddress],
      ],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      });
    await adapterRegistry.methods.getProtocolAdapterNames()
      .call()
      .then((result) => {
        assert.equal(result.length, 2);
        assert.equal(web3.utils.hexToUtf8(result[1]), 'Mock2');
      });
  });

  it('should not remove protocol not by the owner', async () => {
    await expectRevert(adapterRegistry.methods.removeProtocolAdapters(
      [web3.utils.toHex('Mock')],
    )
      .send({
        from: accounts[1],
        gas: '300000',
      }));
  });

  it('should not remove protocol with wrong name', async () => {
    await expectRevert(adapterRegistry.methods.removeProtocolAdapters(
      [web3.utils.toHex('Mock1')],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      }));
  });

  it('should not remove protocol with empty input', async () => {
    await expectRevert(adapterRegistry.methods.removeProtocolAdapters(
      [],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      }));
  });

  it('should remove protocol by the owner', async () => {
    await adapterRegistry.methods.removeProtocolAdapters(
      [web3.utils.toHex('Mock')],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      });
    await adapterRegistry.methods.getProtocolAdapterNames()
      .call()
      .then((result) => {
        assert.equal(result.length, 0);
      });
    await adapterRegistry.methods.addProtocolAdapters(
      [web3.utils.toHex('Mock2')],
      [
        protocolAdapterAddress,
      ],
      [
        [protocolAdapterAddress],
      ],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      });
    await adapterRegistry.methods.addProtocolAdapters(
      [web3.utils.toHex('Mock1')],
      [
        protocolAdapterAddress,
      ],
      [
        [protocolAdapterAddress],
      ],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      });
    await adapterRegistry.methods.getProtocolAdapterNames()
      .call()
      .then((result) => {
        assert.equal(result.length, 2);
        assert.equal(web3.utils.hexToUtf8(result[0]), 'Mock2');
        assert.equal(web3.utils.hexToUtf8(result[1]), 'Mock1');
      });
    await adapterRegistry.methods.removeProtocolAdapters(
      [web3.utils.toHex('Mock2')],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      });
    await adapterRegistry.methods.getProtocolAdapterNames()
      .call()
      .then((result) => {
        assert.equal(result.length, 1);
        assert.equal(web3.utils.hexToUtf8(result[0]), 'Mock1');
      });
    await adapterRegistry.methods.addProtocolAdapters(
      [web3.utils.toHex('Mock2')],
      [
        protocolAdapterAddress,
      ],
      [
        [protocolAdapterAddress],
      ],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      });
    await adapterRegistry.methods.getProtocolAdapterNames()
      .call()
      .then((result) => {
        assert.equal(result.length, 2);
        assert.equal(web3.utils.hexToUtf8(result[0]), 'Mock1');
        assert.equal(web3.utils.hexToUtf8(result[1]), 'Mock2');
      });
    await adapterRegistry.methods.removeProtocolAdapters(
      [web3.utils.toHex('Mock2')],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      });
    await adapterRegistry.methods.getProtocolAdapterNames()
      .call()
      .then((result) => {
        assert.equal(result.length, 1);
        assert.equal(web3.utils.hexToUtf8(result[0]), 'Mock1');
      });
  });

  it('should not update protocol adapter not by the owner', async () => {
    await expectRevert(adapterRegistry.methods.updateProtocolAdapters(
      [web3.utils.toHex('Mock')],
      [ONE],
      [[]],
    )
      .send({
        from: accounts[1],
        gas: '300000',
      }));
  });

  it('should not update protocol adapter with wrong protocol name', async () => {
    await expectRevert(adapterRegistry.methods.updateProtocolAdapters(
      [web3.utils.toHex('Mock1')],
      [ONE],
      [[]],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      }));
  });

  it('should not update protocol adapter with zero address', async () => {
    await expectRevert(adapterRegistry.methods.updateProtocolAdapters(
      [web3.utils.toHex('Mock')],
      [ZERO],
      [[ONE]],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      }));
  });

  it('should not update protocol adapter with different lengths 1', async () => {
    await expectRevert(adapterRegistry.methods.updateProtocolAdapters(
      [web3.utils.toHex('Mock')],
      [ZERO, ZERO],
      [[ONE]],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      }));
  });

  it('should not update protocol adapter with different lengths 2', async () => {
    await expectRevert(adapterRegistry.methods.updateProtocolAdapters(
      [web3.utils.toHex('Mock')],
      [ZERO],
      [[ONE], [ONE]],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      }));
  });

  it('should not update protocol adapter with empty input', async () => {
    await expectRevert(adapterRegistry.methods.updateProtocolAdapters(
      [],
      [],
      [],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      }));
  });

  it('should update protocol adapter by the owner', async () => {
    await adapterRegistry.methods.updateProtocolAdapters(
      [web3.utils.toHex('Mock')],
      [ONE],
      [[]],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      });
    await adapterRegistry.methods.getProtocolAdapterAddress(web3.utils.toHex('Mock'))
      .call()
      .then((result) => {
        assert.equal(result, ONE);
      });
    await adapterRegistry.methods.updateProtocolAdapters(
      [web3.utils.toHex('Mock')],
      [ONE],
      [[ONE, ONE]],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      });
    await adapterRegistry.methods.getSupportedTokens(web3.utils.toHex('Mock'))
      .call()
      .then((result) => {
        assert.deepEqual(result, [ONE, ONE]);
      });
    await adapterRegistry.methods.updateProtocolAdapters(
      [web3.utils.toHex('Mock')],
      [TWO],
      [[TWO, TWO]],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      });
    await adapterRegistry.methods.getProtocolAdapterAddress(web3.utils.toHex('Mock'))
      .call()
      .then((result) => {
        assert.deepEqual(result, TWO);
      });
    await adapterRegistry.methods.getSupportedTokens(web3.utils.toHex('Mock'))
      .call()
      .then((result) => {
        assert.deepEqual(result, [TWO, TWO]);
      });
    await adapterRegistry.methods.updateProtocolAdapters(
      [web3.utils.toHex('Mock')],
      [TWO],
      [[]],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      });
    await adapterRegistry.methods.getSupportedTokens(web3.utils.toHex('Mock'))
      .call()
      .then((result) => {
        assert.deepEqual(result, []);
      });
  });

  it('should not add token adapter not by the owner', async () => {
    await expectRevert(adapterRegistry.methods.addTokenAdapters(
      [web3.utils.toHex('ONE')],
      [ONE],
    )
      .send({
        from: accounts[1],
        gas: '300000',
      }));
  });

  it('should not add token adapter with different lengths', async () => {
    await expectRevert(adapterRegistry.methods.addTokenAdapters(
      [web3.utils.toHex('ONE')],
      [ONE, TWO],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      }));
  });

  it('should not add token adapter with zero address', async () => {
    await expectRevert(adapterRegistry.methods.addTokenAdapters(
      [web3.utils.toHex('ONE')],
      [ZERO],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      }));
  });

  it('should not add token adapter with empty name', async () => {
    await expectRevert(adapterRegistry.methods.addTokenAdapters(
      ['0x'],
      [ONE],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      }));
  });

  it('should not add token adapter with existing name', async () => {
    await expectRevert(adapterRegistry.methods.addTokenAdapters(
      [web3.utils.toHex('ERC20')],
      [ONE],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      }));
  });

  it('should not add token adapter with empty input', async () => {
    await expectRevert(adapterRegistry.methods.addTokenAdapters(
      [],
      [],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      }));
  });

  it('should add token adapter by the owner', async () => {
    await adapterRegistry.methods.removeTokenAdapters(
      [web3.utils.toHex('ERC20')],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      });
    await adapterRegistry.methods.addTokenAdapters(
      [web3.utils.toHex('ERC20')],
      [tokenAdapterAddress],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      });
    await adapterRegistry.methods.getTokenAdapterNames()
      .call()
      .then((result) => {
        assert.equal(result.length, 1);
        assert.equal(web3.utils.hexToUtf8(result[0]), 'ERC20');
      });
  });

  it('should not remove token adapter not by the owner', async () => {
    await expectRevert(adapterRegistry.methods.removeTokenAdapters(
      [web3.utils.toHex('ERC20')],
    )
      .send({
        from: accounts[1],
        gas: '300000',
      }));
  });

  it('should not remove token adapter with no names', async () => {
    await expectRevert(adapterRegistry.methods.removeTokenAdapters(
      [],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      }));
  });

  it('should not remove token adapter with bad name', async () => {
    await expectRevert(adapterRegistry.methods.removeTokenAdapters(
      [web3.utils.toHex('ERC220')],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      }));
  });

  it('should remove token adapter by the owner', async () => {
    await adapterRegistry.methods.removeTokenAdapters(
      [web3.utils.toHex('ERC20')],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      });
    await adapterRegistry.methods.getTokenAdapterNames()
      .call()
      .then((result) => {
        assert.equal(result.length, 0);
      });
    await adapterRegistry.methods.addTokenAdapters(
      [web3.utils.toHex('ERC20')],
      [tokenAdapterAddress],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      });
    await adapterRegistry.methods.addTokenAdapters(
      [web3.utils.toHex('CToken')],
      [compoundTokenAdapterAddress],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      });
    await adapterRegistry.methods.getTokenAdapterNames()
      .call()
      .then((result) => {
        assert.deepEqual(result.map(web3.utils.hexToUtf8), ['ERC20', 'CToken']);
      });
    await adapterRegistry.methods.removeTokenAdapters(
      [web3.utils.toHex('ERC20')],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      });
    await adapterRegistry.methods.getTokenAdapterNames()
      .call()
      .then((result) => {
        assert.deepEqual(result.map(web3.utils.hexToUtf8), ['CToken']);
      });
    await adapterRegistry.methods.addTokenAdapters(
      [web3.utils.toHex('ERC20')],
      [tokenAdapterAddress],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      });
    await adapterRegistry.methods.getTokenAdapterNames()
      .call()
      .then((result) => {
        assert.deepEqual(result.map(web3.utils.hexToUtf8), ['CToken', 'ERC20']);
      });
    await adapterRegistry.methods.removeTokenAdapters(
      [web3.utils.toHex('ERC20')],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      });
    await adapterRegistry.methods.getTokenAdapterNames()
      .call()
      .then((result) => {
        assert.deepEqual(result.map(web3.utils.hexToUtf8), ['CToken']);
      });
  });

  it('should not update token adapter not by the owner', async () => {
    await expectRevert(adapterRegistry.methods.updateTokenAdapters(
      [web3.utils.toHex('ERC20')],
      [ONE],
    )
      .send({
        from: accounts[1],
        gas: '300000',
      }));
  });

  it('should not update token adapter with zero address', async () => {
    await expectRevert(adapterRegistry.methods.updateTokenAdapters(
      [web3.utils.toHex('ERC20')],
      [ZERO],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      }));
  });

  it('should not update token adapter with same address', async () => {
    await expectRevert(adapterRegistry.methods.updateTokenAdapters(
      [web3.utils.toHex('ERC20')],
      [tokenAdapterAddress],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      }));
  });

  it('should not update token adapter with different lengths', async () => {
    await expectRevert(adapterRegistry.methods.updateTokenAdapters(
      [web3.utils.toHex('ERC20')],
      [ZERO, ZERO],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      }));
  });

  it('should not update token adapter with empty input', async () => {
    await expectRevert(adapterRegistry.methods.updateTokenAdapters(
      [],
      [],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      }));
  });

  it('should not update token adapter with bad name', async () => {
    await expectRevert(adapterRegistry.methods.updateTokenAdapters(
      [web3.utils.toHex('ERC220')],
      [ONE],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      }));
  });

  it('should update token adapter by the owner', async () => {
    let newTokenAdapterAddress;
    await TokenAdapter.new({ from: accounts[0] })
      .then((result) => {
        newTokenAdapterAddress = result.address;
      });
    await adapterRegistry.methods.updateTokenAdapters(
      [web3.utils.toHex('ERC20')],
      [newTokenAdapterAddress],
    )
      .send({
        from: accounts[0],
        gas: '300000',
      });
    await adapterRegistry.methods.getTokenAdapterAddress(web3.utils.toHex('ERC20'))
      .call()
      .then((result) => {
        assert.equal(result, newTokenAdapterAddress);
      });
  });

  it('should not propose ownership not by the owner', async () => {
    await expectRevert(
      adapterRegistry.methods.proposeOwnership(accounts[1])
        .send({ from: accounts[1] }),
    );
  });

  it('should not propose ownership to the zero address', async () => {
    await expectRevert(
      adapterRegistry.methods.proposeOwnership(ZERO)
        .send({
          from: accounts[0],
          gas: '300000',
        }),
    );
  });

  it('should not propose ownership to the owner address', async () => {
    await expectRevert(
      adapterRegistry.methods.proposeOwnership(accounts[0])
        .send({
          from: accounts[0],
          gas: '300000',
        }),
    );
  });

  it('should not propose ownership to the pending owner address', async () => {
    await adapterRegistry.methods.proposeOwnership(accounts[1])
      .send({
        from: accounts[0],
        gas: '300000',
      });
    await expectRevert(
      adapterRegistry.methods.proposeOwnership(accounts[1])
        .send({
          from: accounts[0],
          gas: '300000',
        }),
    );
  });

  it('should propose ownership by the owner', async () => {
    await adapterRegistry.methods.proposeOwnership(accounts[1])
      .send({
        from: accounts[0],
        gas: '300000',
      });
    await adapterRegistry.methods.owner()
      .call()
      .then((result) => {
        assert.equal(result, accounts[0]);
      });
  });

  it('should not accept ownership not by the pending owner', async () => {
    await adapterRegistry.methods.proposeOwnership(accounts[1])
      .send({
        from: accounts[0],
        gas: '300000',
      });
    await expectRevert(
      adapterRegistry.methods.acceptOwnership()
        .send({
          from: accounts[2],
          gas: '300000',
        }),
    );
  });

  it('should accept ownership by the pending owner', async () => {
    await adapterRegistry.methods.proposeOwnership(accounts[1])
      .send({
        from: accounts[0],
        gas: '300000',
      });
    await adapterRegistry.methods.acceptOwnership()
      .send({
        from: accounts[1],
        gas: '300000',
      });
    await adapterRegistry.methods.owner()
      .call()
      .then((result) => {
        assert.equal(result, accounts[1]);
      });
  });

  it('should be correct balances non-null', async () => {
    await adapterRegistry.methods.getBalances(accounts[0])
      .call()
      .then((result) => {
        assert.equal(
          result[0].protocolAdapterName,
          web3.eth.abi.encodeParameter('bytes32', web3.utils.toHex('Mock')),
        );
        assert.deepEqual(
          result[0].tokenBalances[0],
          [
            web3.eth.abi.encodeParameter('bytes32', web3.utils.toHex('ERC20')),
            protocolAdapterAddress,
            '1000',
          ],
        );
      });
    await adapterRegistry.methods.getFullTokenBalances(
      [[
        web3.eth.abi.encodeParameter('bytes32', web3.utils.toHex('ERC20')),
        protocolAdapterAddress,
        '1000',
      ]],
    )
      .call()
      .then((result) => {
        assert.deepEqual(
          result[0].base,
          [
            protocolAdapterAddress,
            '1000',
            [
              'Not available',
              'N/A',
              '0',
            ],
          ],
        );
      });
  });

  it('should be correct balances null', async () => {
    await adapterRegistry.methods.getBalances(accounts[1])
      .call()
      .then((result) => {
        assert.equal(result.length, 0);
      });
  });

  it('should not be correct balances with wrong adapter', async () => {
    await expectRevert(adapterRegistry.methods.getAdapterBalance(
      web3.utils.toHex('Mock3'),
      [],
      accounts[0],
    )
      .call()
      .then((result) => {
        assert.equal(result.length, 0);
      }));
  });
});
