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
  List,
  U8Value,
  U64Value,
  BooleanValue,
  BytesValue,
  OptionalValue,
} from '@multiversx/sdk-core';
import { PollStatus } from 'types';

const resultsParser = new ResultsParser();

export const useVotingContract = (
  userAddress: string,
  balance: string
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
  
    // Creem els arguments per a createPoll
    const args = [
      BytesValue.fromUTF8(question), // Pregunta com a bytes
      new List(BytesValue, options.map(option => BytesValue.fromUTF8(option))), // Opcions com a llista de bytes
      new U64Value(startTime), // Hora d'inici
      new U64Value(endTime),   // Hora de finalització
      new BooleanValue(canChangeVote), // Canvi de vot permès o no
    ];
  
    // Si hi ha cens de votants, l'afegim als arguments
    if (voterWhitelist.length > 0) {
      const whitelist = new List(Address, voterWhitelist.map(addr => new Address(addr)));
      args.push(whitelist);
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
        processingMessage: 'Creant la votació...',
        errorMessage: 'No s\'ha pogut crear la votació.',
        successMessage: 'Votació creada amb èxit!'
      }
    });
  
    console.log('Sessió iniciada amb ID:', sessionId);
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
  
      console.log('Polls:', polls?.valueOf());
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
  
      console.log('Poll:', poll?.valueOf());
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
  };

  return {
    createPoll,
    getPolls,
    getPoll,
    castVote,
  };
};
