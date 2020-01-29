const AdapterRegistry = artifacts.require('./AdapterRegistry');
const DSRAdapter = artifacts.require('./DSRAdapter');

contract('DSRAdapter', () => {
  const daiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
  const testAddress = '0x5DbC6c9Bf22f78eecDb74275810403416C4F2CA0';

  let accounts;
  let adapterRegistry;
  let dsrAdapter;

  beforeEach(async () => {
    accounts = await web3.eth.getAccounts();
    await DSRAdapter.new({ from: accounts[0] })
      .then((result) => {
        dsrAdapter = result.contract;
      });
    await AdapterRegistry.new(
      [dsrAdapter.options.address],
      [[daiAddress]],
      { from: accounts[0] },
    )
      .then((result) => {
        adapterRegistry = result.contract;
      });
  });

  it('should return correct balances and rates', async () => {
    await adapterRegistry.methods['getBalancesAndRates(address)'](testAddress)
      .call()
      .then((result) => {
        // eslint-disable-next-line no-console
        console.log(`Deposited DAI amount: ${result[0].balances[0].amount.toString()}`);
        assert.equal(result[0].name, 'DSR');
        assert.equal(result[0].balances[0].decimals, 18);
        assert.equal(result[0].balances[0].asset, daiAddress);
        assert.equal(result[0].rates[0].asset, daiAddress);
        assert.equal(result[0].rates[0].components[0].underlying, daiAddress);
        assert.equal(result[0].rates[0].components[0].rate, 1e18);
      });
  });
});
