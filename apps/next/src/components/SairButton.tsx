"use client";
import { useRouter } from "next/navigation";

export default function SairButton() {
  const router = useRouter();
  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }
  return (
    <button onClick={sair} style={{ padding: "2px 10px", fontSize: 12 }}>Sair</button>
  );
}
