import { useGetNetworkConfig } from 'hooks';
import {
  Address,
  AddressValue,
  ContractFunction,
  ProxyNetworkProvider,
  ResultsParser
} from 'utils';
import { abi, smartContract } from './votingSmartContract';
import { useEffect, useState } from 'react';
import {
  SmartContractTransactionsFactory,
  TransactionsFactoryConfig
} from '@multiversx/sdk-core/out';
import { contractAddress } from 'config';
import { signAndSendTransactions } from 'helpers';

const resultsParser = new ResultsParser();

const PONG_TRANSACTION_INFO = {
  processingMessage: 'Fent un dipòsit',
  errorMessage: 'Error en fer el dipòsit',
  successMessage: 'Dipòsit realitzat correctament'
};

export const useVotingContract = (
  userAddress: string,
  balance: string
) => {
  const { network } = useGetNetworkConfig();
  const proxy = new ProxyNetworkProvider(network.apiAddress);
  const [polls, setPolls] = useState<BigInt>(BigInt(0));

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
    voterWhitelist = []
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

  useEffect(() => {
    
  }, [balance]);

  return {
    polls,
    createPoll
  };
};
