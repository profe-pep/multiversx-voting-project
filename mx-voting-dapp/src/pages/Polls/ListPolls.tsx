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
  const [statusFilter, setStatusFilter] = useState<PollStatus>();

  useEffect(() => {
    console.log("Endpoint 'getPolls': Request");
    getPolls(statusFilter)
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
  }, [statusFilter]);

  return (
    <AuthRedirectWrapper>
      <div className="flex flex-col gap-6 max-w-3xl w-full">
        <ContractAddress />
        <div className="flex border-b border-gray-300 rounded-xl bg-white p-6">
          {[
            { label: "All", value: undefined },
            { label: "Not started", value: PollStatus.NotStarted },
            { label: "Ongoing", value: PollStatus.Ongoing },
            { label: "Ended", value: PollStatus.Ended },
          ].map((tab) => (
            <button
              key={tab.label}
              className={`py-2 px-4 text-sm font-medium focus:outline-none transition-all ${
                statusFilter === tab.value
                  ? "border-b-2 border-[#23F7DD] font-semibold"
                  : "text-gray-400 hover:text-[#23F7DD] hover:opacity-80"
              }`}
              onClick={() => setStatusFilter(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <PollsList polls={polls}/>
      </div>
    </AuthRedirectWrapper>
  );
};
