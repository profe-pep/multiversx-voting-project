import { PropsWithChildren } from 'react';
import { WithClassnameType, Poll } from 'types';
import { Link } from "react-router-dom";
import { PollItem } from '.'

interface PollsPropsType extends PropsWithChildren, WithClassnameType {
  polls: Poll[]; 
}

export const PollsList = ({ children, polls}: PollsPropsType) => {
  return <>
    { polls !== undefined && polls.length > 0 ? (
      polls.map((poll) => {
        return (
          <Link to={"/polls/"+poll.id.toFixed()}>
            <div className="rounded-xl bg-white p-6">
                <h2 className="text-xl font-bold">Poll {poll.id.toFixed()}</h2>
                <PollItem poll={poll} />
            </div>
          </Link>
        )
      })
    ):(
      <p>No polls</p>
    )}
  </>
};