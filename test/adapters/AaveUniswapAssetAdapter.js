import displayToken from '../helpers/displayToken';

const ASSET_ADAPTER = '01';

const AdapterRegistry = artifacts.require('AdapterRegistry');
const ProtocolAdapter = artifacts.require('AaveAssetAdapter');
const TokenAdapter = artifacts.require('AaveTokenAdapter');
const ERC20TokenAdapter = artifacts.require('ERC20TokenAdapter');

contract('AaveUniswapAssetAdapter', () => {
  const aUniDAIAddress = '0xBbBb7F2aC04484F7F04A2C2C16f20479791BbB44';
  const testAddress = '0x42b9dF65B219B3dD36FF330A4dD8f327A6Ada990';

  let accounts;
  let adapterRegistry;
  let protocolAdapterAddress;
  let tokenAdapterAddress;
  let erc20TokenAdapterAddress;

  const uniDAI = [
    'Uniswap V1',
    'UNI-V1',
    '18',
  ];

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
    await ERC20TokenAdapter.new({ from: accounts[0] })
      .then((result) => {
        erc20TokenAdapterAddress = result.address;
      });
    await AdapterRegistry.new({ from: accounts[0] })
      .then((result) => {
        adapterRegistry = result.contract;
      });
    await adapterRegistry.methods.addProtocolAdapters(
      [
        `${web3.eth.abi.encodeParameter(
          'bytes32',
          web3.utils.toHex('Aave • Uniswap Market'),
        )
          .slice(0, -2)}${ASSET_ADAPTER}`,
      ],
      [
        protocolAdapterAddress,
      ],
      [[
        aUniDAIAddress,
      ]],
    )
      .send({
        from: accounts[0],
        gas: '1000000',
      });
    await adapterRegistry.methods.addTokenAdapters(
      [
        web3.utils.toHex('ERC20'),
        web3.utils.toHex('AToken'),
      ],
      [
        erc20TokenAdapterAddress,
        tokenAdapterAddress,
      ],
    )
      .send({
        from: accounts[0],
        gas: '1000000',
      });
  });

  it('should return correct balances', async () => {
    await adapterRegistry.methods.getBalances(testAddress)
      .call()
      .then(async (result) => {
        await displayToken(adapterRegistry, result[0].tokenBalances[0]);
      });
    await adapterRegistry.methods.getFullTokenBalances(
      [
        web3.utils.toHex('AToken'),
      ],
      [
        aUniDAIAddress,
      ],
    )
      .call()
      .then((result) => {
        assert.deepEqual(result[0].underlying[0].erc20metadata, uniDAI);
      });
  });
});
