import { useVotingContract } from './votingApi';
import { ContractAddress } from 'components/ContractAddress';
import { useGetAccount } from 'hooks';
import { AuthRedirectWrapper } from 'wrappers';
import { useEffect, useState } from 'react';
import { Poll } from 'types';
import { useParams } from "react-router-dom";
import { formatDate, pollNotStarted, pollOngoing, pollEnded } from './utils';
import { Badge } from 'components';

export const GetPoll = () => {
  const { address, balance } = useGetAccount();
  const {
    getPoll
  } = useVotingContract(address, balance);
  
  const { id } = useParams();
  const [poll, setPoll] = useState<Poll>();

  useEffect(() => {
    console.log(`Endpoint 'getPoll': Request {id}`);
    getPoll(parseInt(id))
      .then((resp) => {
        setPoll(resp?.valueOf());
      })
      .catch((error) => {
        console.error("ERROR:", error);
        alert("Error obtenint llistat de votacions");
      })
      .finally(() => {
        console.log("Endpoint 'getPolls': Response");
      });    
  }, []);
  
  return (
    <AuthRedirectWrapper>
      <div className='flex flex-col gap-6 max-w-3xl w-full'>
      <ContractAddress />
      {poll && (
        <div className="rounded-xl bg-white p-6">
          <h2 className="text-xl font-bold">Poll {poll.id.toFixed()}</h2>
          <p className="font-semibold mt-4">Question:</p>
          <p>{poll.question.toString()}</p>
          <p className="font-semibold mt-4">Options:</p>
          <ol className="list-[upper-alpha] list-inside">
            {poll.options.map((option:any) => (
                <li key={option.name.toString()}>{option.name.toString()}</li>
            ))}
          </ol>
          <p className="font-semibold mt-4">Voting period:</p>
          <p>Start at {formatDate(poll.start_time)}</p> 
          <p>Ends at {formatDate(poll.end_time)}</p>
          <p className="mt-4">
          { pollNotStarted(poll) && (
            <Badge>Not started</Badge>
          )}
          { pollOngoing(poll) && (
            <Badge color="green">Ongoing</Badge>
          )}
          { pollEnded(poll) && (
            <Badge color="red">Ended</Badge>
          )}
          </p>
        </div>
      )}
      </div>
    </AuthRedirectWrapper>
  );
};
