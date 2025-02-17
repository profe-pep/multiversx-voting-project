#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, ManagedVecItem, Clone)]
pub struct PollOption<M: ManagedTypeApi> {
    name: ManagedBuffer<M>,
    vote_count: u64,
}

#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, ManagedVecItem)]
pub struct Poll<M: ManagedTypeApi> {
    id: u64,
    question: ManagedBuffer<M>,
    options: ManagedVec<M, PollOption<M>>,
    start_time: u64,
    end_time: u64,
    creator: ManagedAddress<M>,
    is_closed: bool,
    can_change_vote: bool, // Afegit per permetre canviar el vot
    whitelisted_addresses: Option<ManagedVec<M, ManagedAddress<M>>>, // Cens opcional
}

#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, PartialEq)]
pub enum PollStatus {
    NotStarted,
    Ongoing,
    Ended,
}

#[multiversx_sc::contract]
pub trait VotingContract {
    #[init]
    fn init(&self) {
        self.last_poll_id().set(0u64);
    }

    #[upgrade]
    fn upgrade(&self) {
        // New endpoints with same storages
    }

    // Crear una nova votació
    #[endpoint(createPoll)]
    fn create_poll(
        &self,
        question: ManagedBuffer<Self::Api>,
        options: ManagedVec<Self::Api, ManagedBuffer<Self::Api>>,
        start_time: u64,
        end_time: u64,
        can_change_vote: bool,
        voter_whitelist: OptionalValue<ManagedVec<ManagedAddress<Self::Api>>>
    ) {
        require!(
            options.len() > 1, 
            "Almenys han d'haver dues opcions"
        );
        require!(
            end_time > start_time, 
            "La data de fi ha de ser després de la d'inici"
        );
        require!(
            end_time > self.blockchain().get_block_timestamp(), 
            "La data de fi ha de ser al futur"
        );

        let mut poll_options = ManagedVec::new();
        for option in options.iter() {
            poll_options.push(PollOption {
                name: option.clone_value(),
                vote_count: 0,
            });

        }

        let poll_id = self.last_poll_id().get();

        let poll = Poll {
            id: poll_id,
            question,
            options: poll_options,
            start_time,
            end_time,
            creator: self.blockchain().get_caller(),
            is_closed: false,
            can_change_vote,
            whitelisted_addresses: match voter_whitelist {
                OptionalValue::Some(whitelist) => Some(whitelist),
                OptionalValue::None => None,
            }
        };

        self.polls().insert(poll_id, poll);
        self.last_poll_id().set(poll_id + 1);
    }

    // Obtenir votacions
    #[view(getPolls)]
    fn get_polls(
        &self, 
        status_filter: Option<PollStatus>, 
        creator_filter: Option<ManagedAddress<Self::Api>>
    ) -> ManagedVec<Self::Api, Poll<Self::Api>> {
        let current_time = self.blockchain().get_block_timestamp();
        let mut filtered_polls = ManagedVec::new();
    
        for (_id, poll) in self.polls().iter() {
            // Filtrar per estat si s'ha especificat
            if let Some(status) = &status_filter {
                let status_match = match status {
                    PollStatus::NotStarted => current_time < poll.start_time,
                    PollStatus::Ongoing => current_time >= poll.start_time && current_time <= poll.end_time,
                    PollStatus::Ended => current_time > poll.end_time,
                };
                if !status_match {
                    continue;
                }
            }
    
            // Filtrar per creador si s'ha especificat
            if let Some(creator) = &creator_filter {
                if poll.creator != *creator {
                    continue;
                }
            }
    
            filtered_polls.push(poll);
        }
    
        filtered_polls
    }
    
    // Consultar una votació i les seves opcions
    #[view(getPoll)]
    fn get_poll(&self, poll_id: u64) -> Poll<Self::Api> {
        self.polls().get(&poll_id).unwrap()
    }

    // Modificar una votació (només el creador pot fer-ho)
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
        let mut poll = self.polls().get(&poll_id).unwrap();
        
        require!(
            poll.creator == caller,
            "Només el creador pot modificar aquesta votació."
        );

        require!(
            !poll.is_closed,
            "No es pot modificar una votació tancada."
        );

        // Comprova l'estat de la votació
        let current_time = self.blockchain().get_block_timestamp();
        let has_started = current_time >= poll.start_time;
        let has_ended = current_time > poll.end_time;

        if has_started {
            // Si la votació ha començat, només permet modificar la data de fi
            require!(
                !has_ended,
                "No es pot modificar una votació que ja ha finalitzat."
            );

            require!(
                new_end_time > current_time,
                "La nova data de fi ha de ser al futur per allargar la votació."
            );

            poll.end_time = new_end_time;
        } else {
            // Si la votació encara no ha començat, permet modificar tot
            require!(
                new_options.len() > 1, 
                "Almenys han d'haver dues opcions"
            );
            require!(
                new_end_time > new_start_time, 
                "La data de fi ha de ser després de la d'inici"
            );
            require!(
                new_end_time > current_time, 
                "La data de fi ha de ser al futur"
            );

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
        }

        self.polls().insert(poll_id, poll);
    }

    // Tancar anticipadament una votació (només el creador pot fer-ho)
    #[endpoint(closePoll)]
    fn close_poll(&self, poll_id: u64) {
        let caller = self.blockchain().get_caller();
        let mut poll = self.polls().get(&poll_id).unwrap();
        
        require!(
            poll.creator == caller,
            "Només el creador pot tancar aquesta votació."
        );

        poll.is_closed = true;
        self.polls().insert(poll_id, poll);
    }

    // Votar en una opció
    #[endpoint(castVote)]
    fn cast_vote(&self, poll_id: u64, option_index: usize) {
        let caller = self.blockchain().get_caller();
        let mut poll = self.polls().get(&poll_id).unwrap();

        require!(
            !poll.is_closed,
            "Aquesta votació està tancada."
        );

        let current_time = self.blockchain().get_block_timestamp();
        require!(
            current_time >= poll.start_time && current_time <= poll.end_time,
            "La votació no està activa."
        );

        require!(
            option_index < poll.options.len(),
            "Índex d'opció no vàlid."
        );

        // Comprovació de cens
        if let Some(whitelist) = &poll.whitelisted_addresses {
            require!(
                whitelist.iter().any(|addr| addr == (&caller).into()), 
                "No estàs al cens de votants."
            );
        }

        if poll.can_change_vote {
            // Si es pot canviar el vot, utilitzem "votes"
            let mut votes = self.votes(poll_id);

            if let Some(previous_vote) = votes.get(&caller) {
                // Si ja ha votat, restem el vot de l'opció anterior
                self.remove_vote(&mut poll, previous_vote);
            }

            // Afegim el nou vot
            self.add_vote(&mut poll, option_index);

            // Guardem el nou vot
            votes.insert(caller, option_index);

        } else {
            // Si NO es pot canviar el vot, utilitzem "voted_addresses"
            let mut voted_addresses = self.voted_addresses(poll_id);

            require!(
                !voted_addresses.contains(&caller),
                "Ja has votat i no es permet canviar el vot."
            );
            
            // Afegim el nou vot
            self.add_vote(&mut poll, option_index);

            // Marquem que aquest usuari ha votat
            voted_addresses.insert(caller);
        }

        self.polls().insert(poll_id, poll);
    }

    // Helper
    fn add_vote(&self, poll: &mut Poll<Self::Api>, option_index: usize) {
        let mut selected_option = poll.options.get(option_index).clone();
        selected_option.vote_count += 1;
        poll.options.set(option_index, selected_option)
            .expect("No s'ha pogut registrar el vot");
    }

    // Helper
    fn remove_vote(&self, poll: &mut Poll<Self::Api>, option_index: usize) {
        let mut selected_option = poll.options.get(option_index).clone();
        require!(
            selected_option.vote_count > 0,
            "Error en el recompte de vots."
        );
        selected_option.vote_count -= 1;
        poll.options.set(option_index, selected_option)
            .expect("No s'ha pogut actualitzar el vot");
    }

    // Consultar resultats agregats d'una votació
    #[view(getPollResults)]
    fn get_poll_results(&self, poll_id: u64) -> MultiValueEncoded<(ManagedBuffer<Self::Api>, u64, u64)> {
        let poll = self.polls().get(&poll_id).unwrap();
        let mut results = MultiValueEncoded::new();

        // Calculem el total de vots
        let total_votes: u64 = poll.options.iter().map(|option| option.vote_count).sum();

        for option in poll.options.iter() {
            let percentage = if total_votes > 0 {
                option.vote_count * 100 / total_votes
            } else {
                0
            };

            results.push((option.name.clone(), option.vote_count, percentage));
        }

        results
    }

    // Consultar estadístiques de participació d'una votació
    #[view(getPollParticipationStats)]
    fn get_poll_participation_stats(&self, poll_id: u64) -> (u64, Option<u64>) {
        let poll = self.polls().get(&poll_id).unwrap();

        // Nombre de participants
        let participant_count = if poll.can_change_vote {
            // Si es pot canviar el vot, comptem els participants de "votes"
            let votes = self.votes(poll_id);
            votes.len()
        } else {
            // Si NO es pot canviar el vot, comptem els participants de "voted_addresses"
            let voted_addresses = self.voted_addresses(poll_id);
            voted_addresses.len()
        };

        // Percentatge de participació
        let participation_percentage = if let Some(whitelist) = &poll.whitelisted_addresses {
            // Si hi ha cens, es calcula respecte al cens
            let total_cens = whitelist.len();
            Some(participant_count * 100 / total_cens)
        } else {
            None
        };
        
        (participant_count.try_into().unwrap(), participation_percentage.map(|p| p.try_into().unwrap()))
    }

    // Storage
    #[storage_mapper("polls")]
    fn polls(&self) -> MapMapper<Self::Api, u64, Poll<Self::Api>>;

    #[storage_mapper("last_poll_id")]
    fn last_poll_id(&self) -> SingleValueMapper<Self::Api, u64>;

    #[storage_mapper("voted_addresses")]
    fn voted_addresses(&self, poll_id: u64) -> UnorderedSetMapper<Self::Api, ManagedAddress<Self::Api>>;

    #[storage_mapper("votes")]
    fn votes(&self, poll_id: u64) -> MapMapper<ManagedAddress<Self::Api>, usize>;
}
