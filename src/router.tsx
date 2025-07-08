import {
  createRouter,
  createRoute,
  createRootRoute,
  Outlet,
  createHashHistory,
} from '@tanstack/react-router';
import HomePage from './components/HomePage';
import ThankYouPage from './components/ThankYouPage';

// Create a hash history for GitHub Pages compatibility
const hashHistory = createHashHistory();

// Create a root route
const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
    </>
  ),
});

// Create the index route
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

// Create the thank you route
const thankYouRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/thank-you',
  component: ThankYouPage,
});

// Create the route tree
const routeTree = rootRoute.addChildren([indexRoute, thankYouRoute]);

// Create the router with hash history
export const router = createRouter({
  routeTree,
  history: hashHistory,
});

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
