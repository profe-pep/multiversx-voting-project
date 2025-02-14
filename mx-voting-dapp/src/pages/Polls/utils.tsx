import moment from 'moment';

export const formatDate = (timestamp: string) => {
  return moment(Number(timestamp) * 1000).format('DD/MM/YY - HH:mm');
};
