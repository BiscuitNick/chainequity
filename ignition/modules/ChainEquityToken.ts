import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const ChainEquityTokenModule = buildModule('ChainEquityTokenModule', (m) => {
  const deployer = m.getAccount(0);

  const token = m.contract('ChainEquityToken', ['ChainEquity', 'CEQ', deployer]);

  return { token };
});

export default ChainEquityTokenModule;
