#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, TypeAbi, ManagedVecItem)]
pub struct PollOption<M: ManagedTypeApi> {
    name: ManagedBuffer<M>,
    vote_count: u64,
}

#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, TypeAbi)]
pub struct Poll<M: ManagedTypeApi> {
    question: ManagedBuffer<M>,
    options: ManagedVec<M, PollOption<M>>,
    creator: ManagedAddress<M>,
    start_time: u64,
    end_time: u64,
    is_closed: bool,
}

#[multiversx_sc::contract]
pub trait VotingContract {
    #[init]
    fn init(&self) {
        self.total_polls().set(0u64);
    }

    /// Crear una nova votació
    #[endpoint(createPoll)]
    fn create_poll(
        &self,
        question: ManagedBuffer<Self::Api>,
        options: ManagedVec<Self::Api, ManagedBuffer<Self::Api>>,
        start_time: u64,
        end_time: u64
    ) {
        require!(options.len() > 1, "Almenys han d'haver dues opcions");
        require!(end_time > start_time, "La data de fi ha de ser després de la d'inici");
        require!(end_time > self.blockchain().get_block_timestamp(), "La data de fi ha de ser al futur");

        let creator = self.blockchain().get_caller();
        let poll_id = self.total_polls().get();
        self.total_polls().set(poll_id + 1);

        let mut poll_options = ManagedVec::new();
        for option in options.iter() {
            poll_options.push(PollOption {
                name: option.clone_value(),
                vote_count: 0,
            });
        }

        let poll = Poll {
            question,
            options: poll_options,
            creator,
            start_time,
            end_time,
            is_closed: false,
        };

        self.polls().insert(poll_id, &poll);
    }

    /// Votar en una votació existent
    #[endpoint(castVote)]
    fn cast_vote(&self, poll_id: u64, option_index: usize) {
        let caller = self.blockchain().get_caller();
        require!(
            !self.has_voted(poll_id, &caller), 
            "Ja has votat en aquesta votació."
        );

        let current_time = self.blockchain().get_block_timestamp();
        let mut poll = self.polls().get(poll_id).unwrap();
        
        require!(
            !poll.is_closed,
            "Aquesta votació està tancada."
        );

        require!(
            current_time >= poll.start_time && current_time <= poll.end_time,
            "Aquesta votació no està activa."
        );

        require!(
            option_index < poll.options.len(),
            "Índex d'opció no vàlid."
        );

        let mut option = poll.options.get(option_index);
        option.vote_count += 1;
        poll.options.set(option_index, &option);

        self.polls().insert(poll_id, &poll);
        self.voted_addresses(poll_id).insert(caller);
    }

    /// Tancar anticipadament una votació (només el creador pot fer-ho)
    #[endpoint(closePoll)]
    fn close_poll(&self, poll_id: u64) {
        let caller = self.blockchain().get_caller();
        let mut poll = self.polls().get(poll_id).unwrap();
        
        require!(
            poll.creator == caller,
            "Només el creador pot tancar aquesta votació."
        );

        poll.is_closed = true;
        self.polls().insert(poll_id, &poll);
    }

    /// Modificar una votació (només el creador pot fer-ho)
    #[endpoint(modifyPoll)]
    fn modify_poll(
        &self,
        poll_id: u64,
        new_question: ManagedBuffer<Self::Api>,
        new_options: ManagedVec<Self::Api, ManagedBuffer<Self::Api>>,
        new_start_time: u64,
        new_end_time: u64
    ) {
        let caller = self.blockchain().get_caller();
        let mut poll = self.polls().get(poll_id).unwrap();
        
        require!(
            poll.creator == caller,
            "Només el creador pot modificar aquesta votació."
        );

        require!(new_options.len() > 1, "Almenys han d'haver dues opcions");
        require!(new_end_time > new_start_time, "La data de fi ha de ser després de la d'inici");
        require!(new_end_time > self.blockchain().get_block_timestamp(), "La data de fi ha de ser al futur");

        poll.question = new_question;
        poll.options.clear();

        for option in new_options.iter() {
            poll.options.push(PollOption {
                name: option.clone_value(),
                vote_count: 0,  // Es reinicia el recompte
            });
        }

        poll.start_time = new_start_time;
        poll.end_time = new_end_time;

        self.polls().insert(poll_id, &poll);
    }

    /// Consultar una votació i les seves opcions
    #[view(getPoll)]
    fn get_poll(&self, poll_id: u64) -> Poll<Self::Api> {
        self.polls().get(poll_id).unwrap()
    }

    // Storage
    #[storage_mapper("polls")]
    fn polls(&self) -> MapMapper<Self::Api, u64, Poll<Self::Api>>;

    #[storage_mapper("total_polls")]
    fn total_polls(&self) -> SingleValueMapper<Self::Api, u64>;

    #[storage_mapper("voted_addresses")]
    fn voted_addresses(&self, poll_id: u64) -> UnorderedSetMapper<Self::Api, ManagedAddress<Self::Api>>;

    // Helper
    fn has_voted(&self, poll_id: u64, address: &ManagedAddress<Self::Api>) -> bool {
        self.voted_addresses(poll_id).contains(address)
    }
}
