import { useGetNetworkConfig } from 'hooks';
import {
  Address,
  AddressValue,
  ContractFunction,
  ProxyNetworkProvider,
  ResultsParser
} from 'utils';
import { abi, smartContract } from './votingSmartContract';
import { contractAddress } from 'config';
import { signAndSendTransactions } from 'helpers';
import {
  SmartContractTransactionsFactory,
  TransactionsFactoryConfig
} from '@multiversx/sdk-core/out';
import {
  U8Value,
  U64Value,
  BooleanValue,
  BytesValue,
  BigUIntValue, 
  ArgSerializer
} from '@multiversx/sdk-core';
import { PollStatus } from 'types';

const resultsParser = new ResultsParser();

export const useVotingContract = (
  userAddress: string
) => {

  const { network } = useGetNetworkConfig();
  const proxy = new ProxyNetworkProvider(network.apiAddress);

  interface CreatePollParams {
    question: string;
    options: string[];
    startTime: number;
    endTime: number;
    canChangeVote: boolean;
    voterWhitelist?: string[]; // Llista d'adreces opcionals
  }

  const createPoll = async ({
    question,
    options,
    startTime,
    endTime,
    canChangeVote,
    voterWhitelist = [] // Optional
  }: CreatePollParams) => {

    if (!userAddress) {
      console.error('No user address');
      return;
    }
  
    const factoryConfig = new TransactionsFactoryConfig({
      chainID: network.chainId
    });
  
    const factory = new SmartContractTransactionsFactory({
      config: factoryConfig,
      abi
    });

    // Convertim els valors al format correcte
    const args = [
      BytesValue.fromUTF8(question), // Pregunta com a cadena UTF-8
      options.map(opt => BytesValue.fromUTF8(opt)), // Opcions com a List<bytes>
      new BigUIntValue(startTime), // Temps d'inici en BigUInt
      new BigUIntValue(endTime), // Temps de finalització en BigUInt
      new BooleanValue(canChangeVote), // Boolean
    ];

    // TODO Fix voters whitelist
    // Afegim el cens opcionalment
    if (voterWhitelist.length > 0) {
      // Convertim cada adreça a BytesValue
      const whitelistSerialized = voterWhitelist.map(addr => BytesValue.fromHex(addr));
      args.push(whitelistSerialized);
    }
    
    // Creem la transacció
    const transaction = factory.createTransactionForExecute({
      sender: new Address(userAddress),
      contract: new Address(contractAddress),
      function: 'createPoll',
      gasLimit: BigInt(10000000),
      arguments: args,
      nativeTransferAmount: BigInt(0) // No estem enviant EGLD
    });
  
    const sessionId = await signAndSendTransactions({
      transactions: [transaction],
      callbackRoute: '',
      transactionsDisplayInfo: {
        processingMessage: 'Creating poll...',
        errorMessage: 'Error during poll creation :-(',
        successMessage: 'Poll sucessfuly created!'
      }
    });
  
    console.log('Sessió iniciada amb ID:', sessionId);

    return sessionId;
  };
  
  const getPolls = async (
    statusFilter?: PollStatus // Optional
  ) => {
    try {
      // Codificació de l'argument segons el format esperat pel smart contract
      const encodedStatus = statusFilter !== undefined
        // "0x01" + PollStatus (en hexadecimal)
        ? `01${statusFilter.toString(16).padStart(2, '0')}`
        // "0x00" per indicar "None"
        : '00';
      
      const query = smartContract.createQuery({
        func: new ContractFunction('getPolls'),
        args: [BytesValue.fromHex(encodedStatus)]
      });
  
      const queryResponse = await proxy.queryContract(query);
  
      const endpointDefinition = smartContract.getEndpoint('getPolls');
  
      const { firstValue: polls } = resultsParser.parseQueryResponse(
        queryResponse,
        endpointDefinition
      );

      // console.log('Polls:', polls?.valueOf());
      return polls;
    } catch (err) {
      console.error('Unable to call getPolls', err);
      return [];
    }
  };

  const getPoll = async (
    id: number,
  ) => {
    try {
      const query = smartContract.createQuery({
        func: new ContractFunction('getPoll'),
        args: [
          new U64Value(id)
        ]
      });
  
      const queryResponse = await proxy.queryContract(query);
  
      const endpointDefinition = smartContract.getEndpoint('getPoll');
  
      const { firstValue: poll } = resultsParser.parseQueryResponse(
        queryResponse,
        endpointDefinition
      );
  
      // console.log('Poll:', poll?.valueOf());
      return poll;
    } catch (err) {
      console.error('Unable to call getPoll', err);
      return [];
    }
  };
    
  const castVote = async (pollId: number, pollOption: number) => {
    if (!userAddress) {
      console.error('No user address');
      return;
    }

    const factoryConfig = new TransactionsFactoryConfig({
      chainID: network.chainId
    });

    let factory = new SmartContractTransactionsFactory({
      config: factoryConfig,
      abi
    });

    const transaction = factory.createTransactionForExecute({
      sender: new Address(userAddress),
      contract: new Address(contractAddress),
      function: 'castVote',
      gasLimit: BigInt(10000000),
      arguments: [
        new U64Value(pollId),
        new U8Value(pollOption) // Si el valor pot ser gran, utilitza U64Value aquí també
      ]
    });

    const sessionId = await signAndSendTransactions({
      transactions: [transaction],
      callbackRoute: '',
      transactionsDisplayInfo: {
        processingMessage: `Voting choosen option in poll ${pollId}...`,
        errorMessage: 'Error during vote process :-(',
        successMessage: 'Vote successfully stored!'
      }
    });
    
    console.log('Sessió iniciada amb ID:', sessionId);

    return sessionId;
  };

  return {
    createPoll,
    getPolls,
    getPoll,
    castVote,
  };
};
