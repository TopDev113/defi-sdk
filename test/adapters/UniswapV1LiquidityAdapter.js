import displayToken from '../helpers/displayToken';

const AdapterRegistry = artifacts.require('./AdapterRegistry');
const ProtocolAdapter = artifacts.require('./UniswapV1LiquidityAdapter');
const TokenAdapter = artifacts.require('./UniswapV1TokenAdapter');
const CompoundTokenAdapter = artifacts.require('./CompoundTokenAdapter');
const ERC20TokenAdapter = artifacts.require('./ERC20TokenAdapter');

contract('UniswapV1LiquidityAdapter', () => {
  const batUniAddress = '0x2E642b8D59B45a1D8c5aEf716A84FF44ea665914';
  const mkrUniAddress = '0x2C4Bd064b998838076fa341A83d007FC2FA50957';
  const daiUniAddress = '0x2a1530C4C41db0B0b2bB646CB5Eb1A67b7158667';
  const usdcUniAddress = '0x97deC872013f6B5fB443861090ad931542878126';
  const snxUniAddress = '0x3958B4eC427F8fa24eB60F42821760e88d485f7F';
  const saiUniAddress = '0x09cabEC1eAd1c0Ba254B09efb3EE13841712bE14';
  const cDaiUniAddress = '0x34E89740adF97C3A9D3f63Cc2cE4a914382c230b';
  const cSaiUniAddress = '0x45A2FDfED7F7a2c791fb1bdF6075b83faD821ddE';
  const batAddress = '0x0D8775F648430679A709E98d2b0Cb6250d2887EF';
  const daiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
  const mkrAddress = '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2';
  const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  const snxAddress = '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F';
  const saiAddress = '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359';
  const ethAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
  const testAddress = '0x42b9dF65B219B3dD36FF330A4dD8f327A6Ada990';

  let accounts;
  let adapterRegistry;
  let protocolAdapterAddress;
  let tokenAdapterAddress;
  let cTokenAdapterAddress;
  let erc20TokenAdapterAddress;
  const batUni = [
    batUniAddress,
    web3.eth.abi.encodeParameter('bytes32', web3.utils.toHex('Uniswap V1 Pool Token')),
    [
      'BAT Pool',
      'UNI-V1',
      '18',
    ],
  ];
  const mkrUni = [
    mkrUniAddress,
    web3.eth.abi.encodeParameter('bytes32', web3.utils.toHex('Uniswap V1 Pool Token')),
    [
      'MKR Pool',
      'UNI-V1',
      '18',
    ],
  ];
  const daiUni = [
    daiUniAddress,
    web3.eth.abi.encodeParameter('bytes32', web3.utils.toHex('Uniswap V1 Pool Token')),
    [
      'DAI Pool',
      'UNI-V1',
      '18',
    ],
  ];
  const usdcUni = [
    usdcUniAddress,
    web3.eth.abi.encodeParameter('bytes32', web3.utils.toHex('Uniswap V1 Pool Token')),
    [
      'USDC Pool',
      'UNI-V1',
      '18',
    ],
  ];
  const snxUni = [
    snxUniAddress,
    web3.eth.abi.encodeParameter('bytes32', web3.utils.toHex('Uniswap V1 Pool Token')),
    [
      'SNX Pool',
      'UNI-V1',
      '18',
    ],
  ];
  const cDaiUni = [
    cDaiUniAddress,
    web3.eth.abi.encodeParameter('bytes32', web3.utils.toHex('Uniswap V1 Pool Token')),
    [
      'cDAI Pool',
      'UNI-V1',
      '18',
    ],
  ];
  const saiUni = [
    saiUniAddress,
    web3.eth.abi.encodeParameter('bytes32', web3.utils.toHex('Uniswap V1 Pool Token')),
    [
      'SAI Pool',
      'UNI-V1',
      '18',
    ],
  ];
  const cSaiUni = [
    cSaiUniAddress,
    web3.eth.abi.encodeParameter('bytes32', web3.utils.toHex('Uniswap V1 Pool Token')),
    [
      'cSAI Pool',
      'UNI-V1',
      '18',
    ],
  ];
  const dai = [
    daiAddress,
    web3.eth.abi.encodeParameter('bytes32', web3.utils.toHex('ERC20')),
    [
      'Dai Stablecoin',
      'DAI',
      '18',
    ],
  ];
  const mkr = [
    mkrAddress,
    web3.eth.abi.encodeParameter('bytes32', web3.utils.toHex('ERC20')),
    [
      'Maker',
      'MKR',
      '18',
    ],
  ];
  const usdc = [
    usdcAddress,
    web3.eth.abi.encodeParameter('bytes32', web3.utils.toHex('ERC20')),
    [
      'USD//C',
      'USDC',
      '6',
    ],
  ];
  const snx = [
    snxAddress,
    web3.eth.abi.encodeParameter('bytes32', web3.utils.toHex('ERC20')),
    [
      'Synthetix Network Token',
      'SNX',
      '18',
    ],
  ];
  const sai = [
    saiAddress,
    web3.eth.abi.encodeParameter('bytes32', web3.utils.toHex('ERC20')),
    [
      'Sai Stablecoin v1.0',
      'SAI',
      '18',
    ],
  ];
  const eth = [
    ethAddress,
    web3.eth.abi.encodeParameter('bytes32', web3.utils.toHex('ERC20')),
    [
      'Ether',
      'ETH',
      '18',
    ],
  ];
  const bat = [
    batAddress,
    web3.eth.abi.encodeParameter('bytes32', web3.utils.toHex('ERC20')),
    [
      'Basic Attention Token',
      'BAT',
      '18',
    ],
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
    await CompoundTokenAdapter.new({ from: accounts[0] })
      .then((result) => {
        cTokenAdapterAddress = result.address;
      });
    await ERC20TokenAdapter.new({ from: accounts[0] })
      .then((result) => {
        erc20TokenAdapterAddress = result.address;
      });
    await AdapterRegistry.new({ from: accounts[0] })
      .then((result) => {
        adapterRegistry = result.contract;
      });
    await adapterRegistry.methods.addProtocols(
      [web3.utils.toHex('Uniswap V1')],
      [[
        'Mock Protocol Name',
        'Mock protocol description',
        'Mock website',
        'Mock icon',
        '0',
      ]],
      [[
        protocolAdapterAddress,
      ]],
      [[[
        batUniAddress,
        mkrUniAddress,
        daiUniAddress,
        usdcUniAddress,
        snxUniAddress,
        saiUniAddress,
        cDaiUniAddress,
        cSaiUniAddress,
      ]]],
    )
      .send({
        from: accounts[0],
        gas: '1000000',
      });
    await adapterRegistry.methods.addTokenAdapters(
      [
        web3.utils.toHex('ERC20'),
        web3.utils.toHex('Uniswap V1 Pool Token'),
        web3.utils.toHex('CToken'),
      ],
      [erc20TokenAdapterAddress, tokenAdapterAddress, cTokenAdapterAddress],
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
        await displayToken(adapterRegistry, result[0].adapterBalances[0].balances[0]);
        await displayToken(adapterRegistry, result[0].adapterBalances[0].balances[1]);
        await displayToken(adapterRegistry, result[0].adapterBalances[0].balances[2]);
        await displayToken(adapterRegistry, result[0].adapterBalances[0].balances[3]);
        await displayToken(adapterRegistry, result[0].adapterBalances[0].balances[4]);
        await displayToken(adapterRegistry, result[0].adapterBalances[0].balances[5]);
        await displayToken(adapterRegistry, result[0].adapterBalances[0].balances[6]);
        await displayToken(adapterRegistry, result[0].adapterBalances[0].balances[7]);
      });
    await adapterRegistry.methods.getFinalFullTokenBalances(
      [
        web3.utils.toHex('Uniswap V1 Pool Token'),
        web3.utils.toHex('Uniswap V1 Pool Token'),
        web3.utils.toHex('Uniswap V1 Pool Token'),
        web3.utils.toHex('Uniswap V1 Pool Token'),
        web3.utils.toHex('Uniswap V1 Pool Token'),
        web3.utils.toHex('Uniswap V1 Pool Token'),
        web3.utils.toHex('Uniswap V1 Pool Token'),
        web3.utils.toHex('Uniswap V1 Pool Token'),
      ],
      [
        batUniAddress,
        mkrUniAddress,
        daiUniAddress,
        usdcUniAddress,
        snxUniAddress,
        saiUniAddress,
        cDaiUniAddress,
        cSaiUniAddress,
      ],
    )
      .call()
      .then((result) => {
        assert.deepEqual(result[0].base.metadata, batUni);
        assert.deepEqual(result[1].base.metadata, mkrUni);
        assert.deepEqual(result[2].base.metadata, daiUni);
        assert.deepEqual(result[3].base.metadata, usdcUni);
        assert.deepEqual(result[4].base.metadata, snxUni);
        assert.deepEqual(result[5].base.metadata, saiUni);
        assert.deepEqual(result[6].base.metadata, cDaiUni);
        assert.deepEqual(result[7].base.metadata, cSaiUni);
        assert.deepEqual(result[0].underlying[0].metadata, eth);
        assert.deepEqual(result[1].underlying[0].metadata, eth);
        assert.deepEqual(result[2].underlying[0].metadata, eth);
        assert.deepEqual(result[3].underlying[0].metadata, eth);
        assert.deepEqual(result[4].underlying[0].metadata, eth);
        assert.deepEqual(result[5].underlying[0].metadata, eth);
        assert.deepEqual(result[6].underlying[0].metadata, eth);
        assert.deepEqual(result[7].underlying[0].metadata, eth);
        assert.deepEqual(result[0].underlying[1].metadata, bat);
        assert.deepEqual(result[1].underlying[1].metadata, mkr);
        assert.deepEqual(result[2].underlying[1].metadata, dai);
        assert.deepEqual(result[3].underlying[1].metadata, usdc);
        assert.deepEqual(result[4].underlying[1].metadata, snx);
        assert.deepEqual(result[5].underlying[1].metadata, sai);
        assert.deepEqual(result[6].underlying[1].metadata, dai);
        assert.deepEqual(result[7].underlying[1].metadata, sai);
      });
  });
});
