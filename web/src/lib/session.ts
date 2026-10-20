import type { QueryClient } from "@tanstack/react-query";

/**
 * Forget the signed-in user on this device.
 *
 * Order matters: first mark "nobody is signed in", which makes the app switch to the sign-in
 * screen and unmount the pages that were showing. Only then drop the other cached data.
 * (Clearing the whole cache first would detach the app's "who's signed in?" check, leaving the
 * old page on screen while its data requests fail.)
 */
export function signOutLocally(qc: QueryClient) {
  qc.setQueryData(["me"], null);
  setTimeout(() => {
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
  }, 0);
  if (typeof caches !== "undefined") caches.delete("eq-session").catch(() => {});
}
