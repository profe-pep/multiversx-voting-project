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
    poll
  } = useVotingContract(address, balance);
  
  return (
    <AuthRedirectWrapper>
      <div className='flex flex-col gap-6 max-w-3xl w-full'>
      <ContractAddress />      
      { polls && polls.length > 0 ? (
        polls.map((poll) => {
          return (
            <div className="flex flex-col gap-6">
              <div className="rounded-xl bg-white p-6">
                <h2 className="text-xl font-bold">Poll {poll.id && poll.id.toFixed()}</h2>
                <p className="font-semibold mt-4">Question:</p>
                <p>{poll.question.toString()}</p>
                <p className="font-semibold mt-4">Options:</p>
                <ol className="list-[upper-alpha] list-inside">
                  {poll.options.map((option:any) => (
                      <li key={option.name.toString()}>{option.name.toString()}</li>
                  ))}
                </ol>
              </div>
            </div>
          )
        })
      ):(
        <p>No polls</p>
      )}
      {poll && (
        <div className="rounded-xl bg-white p-6">
          <h2 className="text-xl font-bold">Poll {poll.id && poll.id.toFixed()}</h2>
          <p className="font-semibold mt-4">Question:</p>
          <p>{poll.question.toString()}</p>
          <p className="font-semibold mt-4">Options:</p>
          <ol className="list-[upper-alpha] list-inside">
            {poll.options.map((option:any) => (
                <li key={option.name.toString()}>{option.name.toString()}</li>
            ))}
          </ol>
        </div>
      )}
      </div>
    </AuthRedirectWrapper>
  );
};
