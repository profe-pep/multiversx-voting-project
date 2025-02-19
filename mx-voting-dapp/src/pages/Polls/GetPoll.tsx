import { useVotingContract } from './votingApi';
import { useGetAccount } from 'hooks';
import { AuthRedirectWrapper } from 'wrappers';
import { useEffect, useState } from 'react';
import { Poll } from 'types';
import { useParams } from "react-router-dom";
import { pollOngoing } from './utils';
import { PollItem } from './components';
import { Link } from 'react-router-dom';

export const GetPoll = () => {
  const { address } = useGetAccount();
  const { getPoll, castVote } = useVotingContract(address);
  
  const { id } = useParams();
  const pollId = Number(id);
  const [poll, setPoll] = useState<Poll>();

  useEffect(() => {
    console.log("Endpoint 'getPoll': Request STARTS");
    getPoll(pollId)
      .then((resp) => {
        console.log("Endpoint 'getPoll': OK");
        setPoll(resp?.valueOf());
      })
      .catch((error) => {
        console.error("Endpoint 'getPoll': ERROR ", error);
        alert("Error getting poll data");
      })
      .finally(() => {
        console.log("Endpoint 'getPolls': Response ENDS");
      });    
  }, []);
  
  const handleVote = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const selectedOption = formData.get('option');
  
    if (selectedOption === null) {
      alert('Si us plau, selecciona una opció abans de votar.');
      return;
    }
    
    const pollOption = Number(selectedOption);
    console.log("Has triat l'opció " + pollOption + " a la votació " + pollId);
    console.log(`Endpoint 'castVote': Request STARTS`);
    castVote(pollId, pollOption)
      .then((resp) => {
        console.log("Endpoint 'castVote': OK ", resp);
      })
      .catch((error) => {
        console.error("Endpoint 'castVote': ERROR ", error);
        alert("Error voting");
      })
      .finally(() => {
        console.log("Endpoint 'castVote': Response ENDS");
      });
  };

  return (
    <AuthRedirectWrapper>
      <div className='flex flex-col gap-6 max-w-3xl w-full'>
      { poll && (
        <>
          <div className="flex justify-end">
            <Link to="/polls" className="flex items-center gap-2">
              <span className="text-lg text-[#23F7DD]">←</span>
              <span className="hover:border-b-2 hover:border-[#23F7DD]">Back to Polls</span>
            </Link>
          </div>
          <div className="rounded-xl bg-white p-6">
            <h2 className="text-xl font-bold">Poll {poll.id.toFixed()}</h2>
            <PollItem poll={poll} />
          </div>
          { pollOngoing(poll) && (
            <div className="rounded-xl bg-white p-6">
              <h3 className="text-lg font-bold">You can vote:</h3>
              <div className='flex items-center gap-4 p-5'>
                <form className="flex flex-col space-y-3 p-4 border border-gray-300 rounded-lg" onSubmit={handleVote}>
                  {poll.options.map((option:any, index) => (
                    <label key={index} className="block">
                      <input
                        type="radio"
                        name="option"
                        value={index}
                        className="mr-2"
                      />
                      {option.name.toString()}
                    </label>
                  ))}
                  <button 
                    type="submit" 
                    className='mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition'
                  >
                    Vote
                  </button>
                </form>
              </div>
            </div>
          )}          
        </>

      )}
      </div>
    </AuthRedirectWrapper>
  );
};
