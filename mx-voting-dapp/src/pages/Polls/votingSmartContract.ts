import { contractAddress } from 'config';
import json from 'contracts/voting-sc.abi.json';
import { AbiRegistry, Address, SmartContract } from '../../utils/sdkDappCore';

export const abi = AbiRegistry.create(json);

export const smartContract = new SmartContract({
  address: new Address(contractAddress),
  abi
});
