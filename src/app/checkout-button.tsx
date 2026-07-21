"use client";

import { useRouter } from "next/navigation";

export default function CheckoutButton({
  tier,
  children,
  className,
}: {
  tier: string;
  children: React.ReactNode;
  className: string;
}) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/checkout?tier=${tier}`)}
      className={className}
    >
      {children}
    </button>
  );
}
