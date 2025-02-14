import { RouteNamesEnum } from 'localConstants';
import { Dashboard, Disclaimer, Home, Polls } from 'pages';
import { RouteType } from 'types';

interface RouteWithTitleType extends RouteType {
  title: string;
}

export const routes: RouteWithTitleType[] = [
  {
    path: RouteNamesEnum.home,
    title: 'Home',
    component: Home
  },
  {
    path: RouteNamesEnum.dashboard,
    title: 'Dashboard',
    component: Dashboard
  },
  {
    path: RouteNamesEnum.disclaimer,
    title: 'Disclaimer',
    component: Disclaimer
  },
  {
    path: RouteNamesEnum.listPolls,
    title: 'Polls',
    component: Polls
  }
];
