import { redirect } from 'next/navigation';

/**
 * Root entry point.
 * Typically used as a loading gate: authenticate the user, then redirect
 * to the first campaign route based on their state.
 *
 * Example: if user has already completed onboarding → /gameplay
 *          otherwise → /onboarding
 */
export default function Home() {
  // TODO: Replace with real entry logic once auth action is wired up.
  redirect('{{FLOW_ENTRY}}');
}
