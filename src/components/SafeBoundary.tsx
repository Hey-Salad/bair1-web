"use client";

import { Component, type ReactNode } from "react";

/**
 * Keeps one optional widget from taking the whole page down with it.
 *
 * The share panel mounts Auth0's SPA SDK, which touches localStorage and
 * crypto. Mobile Safari in private browsing, or with tracking prevention on,
 * can throw there — and an uncaught throw during hydration blanks the entire
 * route, not just the widget. A page whose job is showing a ride should still
 * show the ride when sharing is unavailable.
 */
export default class SafeBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[SafeBoundary] widget failed:", error);
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}
