
export type PollOption = {
  name: string;
  vote_count: number;
};

export type Poll = {
  id: number;
  question: string;
  options: PollOption[];
  start_time: number;
  end_time: number;
  creator: string;
  is_closed: boolean;
  can_change_vote: boolean; // Afegit per permetre canviar el vot
  whitelisted_addresses?: string[]; // Cens opcional
};