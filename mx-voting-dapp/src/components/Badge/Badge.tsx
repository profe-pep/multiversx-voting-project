import { PropsWithChildren } from 'react';
import { WithClassnameType } from 'types';

interface BadgePropsType extends PropsWithChildren, WithClassnameType {
  color?: 'default' | 'dark' | 'red' | 'green' | 'yellow' | 'purple' | 'pink'; 
}

export const Badge = ({ children, color = 'default'}: BadgePropsType) => {
  let className = "text-sm font-medium font-semibold me-2 px-2.5 py-0.5 rounded-sm"
  switch(color) {
    case 'dark':
      className += " bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
      break;
    case 'red':
      className += " bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      break;
    case 'green':
      className += " bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      break;
    case 'yellow':
      className += " bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      break;
    case 'purple':
      className += " bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      break;
    case 'pink':
      className += " bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300"
      break;
    case 'default':
    default:
      className += " bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
  }
  return <span className={className}>{children}</span>;
};