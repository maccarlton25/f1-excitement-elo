import { Suspense } from "react";
import { DuelArena } from "@/components/DuelArena";

export const dynamic = "force-dynamic";

export default function DuelPage() {
  return (
    <section className="flex flex-col gap-8">
      <header>
        <h2 className="text-2xl font-semibold text-slate-100">
          Vote on the Most Exciting Weekend
        </h2>
        <p className="text-sm text-slate-400">
          Choose the race that delivered the bigger strategy storyline. Votes
          update the live Elo ladder stored in Supabase.
        </p>
      </header>
      <Suspense fallback={<p>Loading duel...</p>}>
        <DuelArena />
      </Suspense>
    </section>
  );
}
