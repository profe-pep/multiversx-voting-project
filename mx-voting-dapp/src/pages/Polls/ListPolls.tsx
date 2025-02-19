import { useVotingContract } from './votingApi';
import { ContractAddress } from 'components/ContractAddress';
import { useGetAccount } from 'hooks';
import { AuthRedirectWrapper } from 'wrappers';
import { useEffect, useState } from 'react';
import { Poll, PollStatus } from 'types';
import { PollsList } from './components';

export const ListPolls = () => {
  const { address, balance } = useGetAccount();
  const {
    getPolls
  } = useVotingContract(address, balance);
  
  const [polls, setPolls] = useState<Poll[]>([]);

  useEffect(() => {
    console.log("Endpoint 'getPolls': Request");
    getPolls()
      .then((resp) => {
        setPolls(resp?.valueOf());
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
        <PollsList polls={polls}/>
      </div>
    </AuthRedirectWrapper>
  );
};
