import { useVotingContract } from './votingApi';
import { Button } from 'components/Button';
import { ContractAddress } from 'components/ContractAddress';
import { formatDate } from './utils';
import { useGetAccount } from 'hooks';
import { useState } from 'react';
import { AuthRedirectWrapper } from 'wrappers';
import BigNumber from 'bignumber.js';

export const Polls = () => {
  const { address, balance } = useGetAccount();
  const {
    polls,
    createPoll
  } = useVotingContract(address, balance);
  
  return (
    <AuthRedirectWrapper>
      <ContractAddress />      
      { polls.length > 0 ? ({
        polls.map((poll) => {
          return (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-bold">Poll Question</h2>
                <p className="text-gray-700">{poll.question}</p>
              </div>
      
              <div>
                <h3 className="text-lg font-semibold">Options</h3>
                <ul className="list-disc ml-5">                    
                  { poll.options.length > 0 ? (
                      poll.options.map((option, index) => (
                        <li key={index} className="my-2">
                          {option}
                        </li>
                      ))
                  ) : (
                      <p>No options!</p>
                  )}
                </ul>
              </div>        
            </div>
          )
        })}

      ):(
        <p>No polls</p>
      )}
    </AuthRedirectWrapper>
  );
};
