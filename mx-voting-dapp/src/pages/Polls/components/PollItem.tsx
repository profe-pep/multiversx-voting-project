import { WithClassnameType, Poll } from 'types';
import { Badge } from 'components';
import { formatDate, pollNotStarted, pollOngoing, pollEnded } from '../utils';

interface PollsPropsType extends WithClassnameType {
  poll: Poll; 
}

export const PollItem = ({ poll}: PollsPropsType) => {
  return <>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Columna 1 */}
      <div>
        <p className="font-semibold mt-4">Question:</p>
        <p>{poll.question.toString()}</p>

        <p className="font-semibold mt-4">Options:</p>
        <ol className="list-[upper-alpha] list-inside">
          {poll.options.map((option: any, index) => (
            <li key={index}>{option.name.toString()}</li>
          ))}
        </ol>
      </div>
      {/* Columna 2 */}
      <div>
        <p className="font-semibold mt-4">Voting period:</p>
        <p>Start at {formatDate(poll.start_time)}</p>
        <p>Ends at {formatDate(poll.end_time)}</p>

        <p className="font-semibold mt-4">Status:</p>
        <p>
          {pollNotStarted(poll) && <Badge>Not started</Badge>}
          {pollOngoing(poll) && <Badge color="green">Ongoing</Badge>}
          {pollEnded(poll) && <Badge color="red">Ended</Badge>}
        </p>
      </div>
    </div>
  </>;
};