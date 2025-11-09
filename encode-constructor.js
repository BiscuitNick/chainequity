const { ethers } = require('ethers');

const args = [
  "ChainEquity",
  "CEQ", 
  "0xA86fc157c3BDbb18dD18CFaD8252BA295f9237Fa"
];

const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
  ["string", "string", "address"],
  args
);

console.log(encoded.slice(2)); // Remove 0x prefix
