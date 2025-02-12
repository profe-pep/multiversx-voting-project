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
    creator: ManagedAddress<M>,
    question: ManagedBuffer<M>,
    options: ManagedVec<M, PollOption<M>>,
    start_time: u64,
    end_time: u64,
    is_closed: bool,
    can_change_vote: bool, // Afegit per permetre canviar el vot
    whitelisted_addresses: Option<ManagedVec<M, ManagedAddress<M>>>, // Cens opcional
}

#[multiversx_sc::contract]
pub trait VotingContract {
    #[init]
    fn init(&self) {
        self.total_polls().set(0u64);
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

        let poll = Poll {
            creator: self.blockchain().get_caller(),
            question,
            options: poll_options,
            start_time,
            end_time,
            is_closed: false,
            can_change_vote,
            whitelisted_addresses: match voter_whitelist {
                OptionalValue::Some(whitelist) => Some(whitelist),
                OptionalValue::None => None,
            }
        };

        let poll_id = self.total_polls().get();
        self.polls().insert(poll_id, &poll);
        self.total_polls().set(poll_id + 1);
    }

    // Votar en una opció
    #[endpoint(castVote)]
    fn cast_vote(&self, poll_id: u64, option_index: usize) {
        let caller = self.blockchain().get_caller();
        let mut poll = self.polls().get(poll_id).unwrap();

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
                whitelist.iter().any(|addr| addr == &caller), 
                "No estàs al cens de votants."
            );
        }

        if poll.can_change_vote {
            // Si es pot canviar el vot, utilitzem "votes"
            let mut votes = self.votes(&poll_id);

            if let Some(&previous_vote) = votes.get(&caller) {
                // Si ja ha votat, restem el vot de l'opció anterior
                let mut previous_option = poll.options.get(previous_vote);
                require!(
                    previous_option.vote_count > 0,
                    "Error en el recompte de vots."
                );
                previous_option.vote_count -= 1;
                poll.options.set(previous_vote, &previous_option);
            }

            // Afegim el nou vot
            let mut selected_option = poll.options.get(option_index);
            selected_option.vote_count += 1;
            poll.options.set(option_index, &selected_option);

            // Guardem el nou vot
            votes.insert(caller, option_index);

        } else {
            // Si NO es pot canviar el vot, utilitzem "voted_addresses"
            let mut voted_addresses = self.voted_addresses(&poll_id);

            require!(
                !voted_addresses.contains(&caller),
                "Ja has votat i no es permet canviar el vot."
            );

            // Afegim el vot
            let mut selected_option = poll.options.get(option_index);
            selected_option.vote_count += 1;
            poll.options.set(option_index, &selected_option);

            // Marquem que aquest usuari ha votat
            voted_addresses.insert(caller);
        }

        self.polls().insert(poll_id, &poll);
    }

    // Tancar anticipadament una votació (només el creador pot fer-ho)
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
        let mut poll = self.polls().get(poll_id).unwrap();
        
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

        self.polls().insert(poll_id, &poll);
    }

    // Consultar una votació i les seves opcions
    #[view(getPoll)]
    fn get_poll(&self, poll_id: u64) -> Poll<Self::Api> {
        self.polls().get(poll_id).unwrap()
    }

    // Consultar resultats agregats d'una votació
    #[view(getPollResults)]
    fn get_poll_results(&self, poll_id: u64) -> MultiValueEncoded<(ManagedBuffer<Self::Api>, u64, u64)> {
        let poll = self.polls().get(poll_id).unwrap();
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
        let poll = self.polls().get(poll_id).unwrap();

        // Nombre de participants
        let participant_count = if poll.can_change_vote {
            // Si es pot canviar el vot, comptem els participants de "votes"
            let votes = self.votes(&poll_id);
            votes.len()
        } else {
            // Si NO es pot canviar el vot, comptem els participants de "voted_addresses"
            let voted_addresses = self.voted_addresses(&poll_id);
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
        
        (participant_count, participation_percentage)
    }

    // Storage
    #[storage_mapper("polls")]
    fn polls(&self) -> MapMapper<Self::Api, u64, Poll<Self::Api>>;

    #[storage_mapper("total_polls")]
    fn total_polls(&self) -> SingleValueMapper<Self::Api, u64>;

    #[storage_mapper("voted_addresses")]
    fn voted_addresses(&self, poll_id: u64) -> UnorderedSetMapper<Self::Api, ManagedAddress<Self::Api>>;

    #[storage_mapper("votes")]
    fn votes(&self, poll_id: &u64) -> MapMapper<ManagedAddress<Self::Api>, usize>;

    // Helper
    fn has_voted(&self, poll_id: u64, address: &ManagedAddress<Self::Api>) -> bool {
        self.voted_addresses(poll_id).contains(address)
    }
}
