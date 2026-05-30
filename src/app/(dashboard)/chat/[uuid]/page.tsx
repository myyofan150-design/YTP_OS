"use client";
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function ChatRedirect() {
  const router = useRouter();
  const params = useParams();
  useEffect(() => {
    router.replace(`/chat?c=${params.uuid}`);
  }, [router, params.uuid]);
  return null;
}
