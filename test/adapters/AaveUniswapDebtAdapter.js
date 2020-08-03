import displayToken from '../helpers/displayToken';

const DEBT_ADAPTER = '02';

const AdapterRegistry = artifacts.require('AdapterRegistry');
const ProtocolAdapter = artifacts.require('AaveDebtAdapter');
const ERC20TokenAdapter = artifacts.require('ERC20TokenAdapter');

contract.only('AaveUniswapDebtAdapter', () => {
  const usdtAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
  const testAddress = '0x42b9dF65B219B3dD36FF330A4dD8f327A6Ada990';

  let accounts;
  let adapterRegistry;
  let protocolAdapterAddress;
  let erc20TokenAdapterAddress;
  const usdt = [
    usdtAddress,
    'Tether USD',
    'USDT',
    '6',
  ];

  beforeEach(async () => {
    accounts = await web3.eth.getAccounts();
    await ProtocolAdapter.new({ from: accounts[0] })
      .then((result) => {
        protocolAdapterAddress = result.address;
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
          .slice(0, -2)}${DEBT_ADAPTER}`,
      ],
      [
        protocolAdapterAddress,
      ],
      [[
        usdtAddress,
      ]],
    )
      .send({
        from: accounts[0],
        gas: '1000000',
      });
    await adapterRegistry.methods.addTokenAdapters(
      [web3.utils.toHex('ERC20')],
      [erc20TokenAdapterAddress],
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
      console.log(result)
        await displayToken(adapterRegistry, result[0].tokenBalances[0]);
      });
  });
});
