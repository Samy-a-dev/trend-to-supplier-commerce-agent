"use client";

import { Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function RunLauncher() {
  const router = useRouter();
  const [vertical, setVertical] = useState("home fitness / desk setup");
  const [region, setRegion] = useState("United States");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const runId = crypto.randomUUID();
    const params = new URLSearchParams({
      autostart: "1",
      vertical,
      region
    });
    router.push(`/runs/${runId}?${params.toString()}`);
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="field">
        <label htmlFor="vertical">Vertical</label>
        <input
          className="input"
          id="vertical"
          onChange={(event) => setVertical(event.target.value)}
          required
          value={vertical}
        />
      </div>
      <div className="field">
        <label htmlFor="region">Region</label>
        <input
          className="input"
          id="region"
          onChange={(event) => setRegion(event.target.value)}
          required
          value={region}
        />
      </div>
      <button className="button" type="submit">
        <Play size={16} />
        Start live run
      </button>
    </form>
  );
}
