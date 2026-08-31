"use client";

import { useAuth0 } from "@auth0/auth0-react";
import { useCallback } from "react";

export function useAuthenticatedFetch() {
  const { getAccessTokenSilently } = useAuth0();

  return useCallback(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const token = await getAccessTokenSilently();
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  }, [getAccessTokenSilently]);
}
