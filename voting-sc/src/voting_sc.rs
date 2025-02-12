#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, TypeAbi, ManagedVecItem)]
pub struct PollOption<M: ManagedTypeApi> {
    name: ManagedBuffer<M>,
    vote_count: u64,
}

#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, TypeAbi)]
pub struct VoteCastEvent<M: ManagedTypeApi> {
    voter: ManagedAddress<M>,
    option_name: ManagedBuffer<M>,
}

#[multiversx_sc::contract]
pub trait VotingContract {
    #[init]
    fn init(
        &self,
        poll_question: ManagedBuffer<Self::Api>,
        options: ManagedVec<Self::Api, ManagedBuffer<Self::Api>>,
        start_time: u64,
        end_time: u64,
        allow_vote_change: bool
    ) {
        require!(
            options.len() > 1, 
            "There must be at least two options to vote on."
        );

        require!(
            start_time < end_time,
            "Start time must be before end time."
        );

        self.poll_question().set(poll_question);
        self.options().clear();

        for option in options.iter() {
            let poll_option = PollOption {
                name: option.clone_value(),
                vote_count: 0,
            };
            self.options().push(&poll_option);
        }

        self.start_time().set(start_time);
        self.end_time().set(end_time);
        self.allow_vote_change().set(allow_vote_change);
    }

    #[view(getPollQuestion)]
    fn get_poll_question(&self) -> ManagedBuffer<Self::Api> {
        self.poll_question().get()
    }

    #[view(getOptions)]
    fn get_options(&self) -> ManagedVec<Self::Api, PollOption<Self::Api>> {
        let mut result = ManagedVec::new();
        let options = self.options();

        for option in options.iter() {
            result.push(option);
        }

        result
    }

    #[view(getVotingPeriod)]
    fn get_voting_period(&self) -> (u64, u64) {
        (self.start_time().get(), self.end_time().get())
    }

    #[view(canChangeVote)]
    fn can_change_vote(&self) -> bool {
        self.allow_vote_change().get()
    }

    #[endpoint(castVote)]
    fn cast_vote(&self, option_index: usize) {
        let current_time = self.blockchain().get_block_timestamp();
        require!(
            current_time >= self.start_time().get(),
            "Voting has not started yet."
        );

        require!(
            current_time <= self.end_time().get(),
            "Voting has ended."
        );

        let caller = self.blockchain().get_caller();

        // Comprova si l'usuari ja ha votat
        if self.has_voted(&caller) {
            // Si el canvi de vot no està permès, denega la votació
            require!(
                self.allow_vote_change().get(),
                "You have already voted and vote change is not allowed."
            );

            // Si es permet canviar el vot, troba l'opció anterior i resta un vot
            let previous_vote = self.user_votes().get(&caller);
            let mut options = self.options();
            if let Some(index) = previous_vote {
                let mut previous_option = options.get(index);
                previous_option.vote_count -= 1;
                options.set(index, &previous_option);
            }
        }

        // Continua amb el procés de votació
        let mut options = self.options();
        require!(
            option_index < options.len(), 
            "Invalid option index."
        );

        let mut poll_option = options.get(option_index);
        poll_option.vote_count += 1;
        options.set(option_index, &poll_option);

        // Desa l'opció votada per aquest usuari
        self.user_votes().insert(caller.clone(), option_index);

        // Desa l'adreça per saber que ha votat
        self.voted_addresses().insert(caller.clone());

        self.emit_vote_cast_event(VoteCastEvent {
            voter: caller,
            option_name: poll_option.name.clone(),
        });
    }

    #[event("vote_cast")]
    fn emit_vote_cast_event(&self, vote_event: VoteCastEvent<Self::Api>);

    // Storage
    #[storage_mapper("poll_question")]
    fn poll_question(&self) -> SingleValueMapper<Self::Api, ManagedBuffer<Self::Api>>;

    #[storage_mapper("options")]
    fn options(&self) -> VecMapper<Self::Api, PollOption<Self::Api>>;

    #[storage_mapper("voted_addresses")]
    fn voted_addresses(&self) -> UnorderedSetMapper<Self::Api, ManagedAddress<Self::Api>>;

    #[storage_mapper("start_time")]
    fn start_time(&self) -> SingleValueMapper<Self::Api, u64>;

    #[storage_mapper("end_time")]
    fn end_time(&self) -> SingleValueMapper<Self::Api, u64>;

    #[storage_mapper("allow_vote_change")]
    fn allow_vote_change(&self) -> SingleValueMapper<Self::Api, bool>;

    #[storage_mapper("user_votes")]
    fn user_votes(&self) -> MapMapper<Self::Api, ManagedAddress<Self::Api>, usize>;

    // Helper
    fn has_voted(&self, address: &ManagedAddress<Self::Api>) -> bool {
        self.voted_addresses().contains(address)
    }
}
