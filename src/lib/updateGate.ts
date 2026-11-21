/**
 * Lets a screen tell the auto-updater "don't reload / switch builds right now".
 *
 * Used around work that a reload would lose or half-finish, e.g. the signup request: if the
 * page reloaded after the account was created but before the sign-in finished, the user would
 * be dropped back on the first onboarding step.
 *
 *   const release = holdUpdates();
 *   try { await doTheThing(); } finally { release(); }
 */
let holds = 0;

export function holdUpdates(): () => void {
  holds++;
  let released = false;
  return () => {
    if (!released) {
      released = true;
      holds--;
    }
  };
}

export const updatesHeld = () => holds > 0;
