"use client";

import { Auth0Provider } from "@auth0/auth0-react";

export default function Auth0ProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Auth0Provider
      domain="dev-v71n0fw208s2qy8d.us.auth0.com"
      clientId="JgC92w685FPKvMA2haFiQLpR5viQx3UY"
      authorizationParams={{ redirect_uri: typeof window !== "undefined" ? window.location.origin : "" }}
    >
      {children}
    </Auth0Provider>
  );
}
