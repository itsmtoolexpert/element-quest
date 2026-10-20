import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { signOutLocally } from "./session";

const user = { id: 1, username: "soysauce" };

function signedIn() {
  const qc = new QueryClient();
  qc.setQueryData(["me"], user);
  qc.setQueryData(["elements"], [{ number: 1 }]);
  // Stands in for App's "who's signed in?" check, which stays subscribed while the home page is showing.
  const me = new QueryObserver(qc, { queryKey: ["me"], enabled: false });
  const unsubscribe = me.subscribe(() => {});
  return { qc, me, unsubscribe };
}

describe("signing out", () => {
  it("tells the app nobody is signed in, then drops the other cached data", async () => {
    const { qc, me, unsubscribe } = signedIn();
    signOutLocally(qc);
    expect(me.getCurrentResult().data).toBeNull();
    await new Promise((r) => setTimeout(r, 5));
    expect(qc.getQueryData(["elements"])).toBeUndefined();
    expect(qc.getQueryData(["me"])).toBeNull();
    unsubscribe();
  });

  it("regression: clearing the cache first leaves the app thinking the user is still signed in", () => {
    const { qc, me, unsubscribe } = signedIn();
    qc.clear();
    qc.setQueryData(["me"], null);
    expect(me.getCurrentResult().data).toEqual(user); // the old bug
    unsubscribe();
  });
});
