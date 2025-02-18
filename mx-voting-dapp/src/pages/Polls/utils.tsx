import moment from 'moment';
import { Poll } from 'types';

export const formatDate = (timestamp: string|number) => {
  return moment(Number(timestamp) * 1000).format('DD/MM/YY - HH:mm');
};

export const pollNotStarted = (poll: Poll) : boolean => {
  const now = Date.now();
  const start_time = Number(poll.start_time) * 1000;
  return start_time > now;
};

export const pollOngoing = (poll: Poll) : boolean => {
  const now = Date.now();
  const start_time = Number(poll.start_time) * 1000;
  const end_time = Number(poll.end_time) * 1000;
  return start_time <= now && end_time >= now;
};

export const pollEnded = (poll: Poll) : boolean => {
  const now = Date.now();
  const end_time = Number(poll.end_time) * 1000;
  return end_time < now;
};

const 