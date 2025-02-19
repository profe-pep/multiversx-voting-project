import { useVotingContract } from './votingApi';
import { ContractAddress } from 'components/ContractAddress';
import { useGetAccount } from 'hooks';
import { AuthRedirectWrapper } from 'wrappers';
import { useEffect, useState } from 'react';
import { Poll, PollStatus } from 'types';
import { PollsList } from './components';

export const ListPolls = () => {
  const { address } = useGetAccount();
  const { getPolls, createPoll } = useVotingContract(address);
  
  const [polls, setPolls] = useState<Poll[]>([]);
  const [statusFilter, setStatusFilter] = useState<PollStatus>();
  const [pollCreated, setPollCreated] = useState<boolean>(false);

  useEffect(() => {
    console.log("Endpoint 'getPolls': Request STARTS");
    getPolls(statusFilter)
      .then((resp) => {
        console.log("Endpoint 'getPolls': OK");
        setPolls(resp?.valueOf());
      })
      .catch((error) => {
        console.error("Endpoint 'getPolls': ERROR ", error);
        alert("Error getting polls list");
      })
      .finally(() => {
        console.log("Endpoint 'getPolls': Response ENDS");
        setPollCreated(false); // Reinicia després d'actualitzar les votacions
      });    
  }, [statusFilter, pollCreated]);

  const emptyForm = {
    question: '',
    options: '',
    start_time: '',
    end_time: '',
    can_change_vote: false,
    whitelisted_addresses: '',
  }
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false); // Mostrar/amagar el formulari

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pollData = {
      question: form.question,
      options: form.options.split(',').map(opt => opt.trim()), // Convertir string en array
      startTime: new Date(form.start_time).getTime() / 1000, // Canvi de `start_time` a `startTime`
      endTime: new Date(form.end_time).getTime() / 1000, // Canvi de `end_time` a `endTime`
      canChangeVote: form.can_change_vote, // Canvi de `can_change_vote` a `canChangeVote`
      voterWhitelist: form.whitelisted_addresses // Canvi de `whitelisted_addresses` a `voterWhitelist`
        ? form.whitelisted_addresses.split(',').map(addr => addr.trim())
        : undefined,
    };
    console.log("Poll data:", pollData);
    console.log(`Endpoint 'createPoll': Request STARTS`);
    createPoll({ ...pollData })
      .then((resp) => {
        console.log("Endpoint 'createPoll': OK ", resp);
        // Reset form
        setShowForm(false); 
        setForm(emptyForm);
        // Refresh list
        setPollCreated(true);
      })
      .catch((error) => {
        console.error("Endpoint 'createPoll': ERROR ", error);
        alert("Error creating poll");
      })
      .finally(() => {
        console.log("Endpoint 'createPoll': Response ENDS");
      });
  };

  return (
    <AuthRedirectWrapper>
      <div className="flex flex-col gap-6 max-w-3xl w-full">
        <ContractAddress />

        {/* Pestanyes de filtre + Botó Create Poll */}
        <div className="flex justify-between items-center border-b border-gray-300 rounded-xl bg-white p-6">
          <div className="flex space-x-4">
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
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-[#23F7DD] text-black font-semibold py-2 px-4 rounded-lg hover:opacity-80 transition-all"
          >
            {showForm ? "Hide form" : "+ Create Poll"}
          </button>
        </div>

        {/* Formulari "Create Poll" només es mostra si `showForm` és true */}
        {showForm && (
          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="text-lg font-bold mb-4">Create a new poll</h2>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              {/* Pregunta */}
              <input
                type="text"
                name="question"
                placeholder="Enter poll question"
                value={form.question}
                onChange={handleChange}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring focus:ring-[#23F7DD]"
                required
              />

              {/* Opcions */}
              <input
                type="text"
                name="options"
                placeholder="Enter options (comma-separated)"
                value={form.options}
                onChange={handleChange}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring focus:ring-[#23F7DD]"
                required
              />

              {/* Data inici */}
              <input
                type="datetime-local"
                name="start_time"
                value={form.start_time}
                onChange={handleChange}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring focus:ring-[#23F7DD]"
                required
              />

              {/* Data final */}
              <input
                type="datetime-local"
                name="end_time"
                value={form.end_time}
                onChange={handleChange}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring focus:ring-[#23F7DD]"
                required
              />

              {/* Canvi de vot */}
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="can_change_vote"
                  checked={form.can_change_vote}
                  onChange={handleChange}
                  className="accent-[#23F7DD]"
                />
                <span>Allow vote change</span>
              </label>

              {/* Cens (admissió restringida) */}
              <input
                type="text"
                name="whitelisted_addresses"
                placeholder="Whitelisted addresses (comma-separated, optional)"
                value={form.whitelisted_addresses}
                onChange={handleChange}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring focus:ring-[#23F7DD]"
              />

              {/* Botó de creació */}
              <button
                type="submit"
                className="bg-[#23F7DD] text-black font-semibold py-2 px-4 rounded-lg hover:opacity-80 transition-all"
              >
                Create Poll
              </button>
            </form>
          </div>
        )}

        <PollsList polls={polls} />
      </div>
    </AuthRedirectWrapper>
  );
};
