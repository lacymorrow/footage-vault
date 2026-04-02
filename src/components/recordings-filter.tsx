"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function RecordingsFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [drive, setDrive] = useState(searchParams.get("drive") ?? "");
  const [codec, setCodec] = useState(searchParams.get("codec") ?? "");

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (drive) params.set("drive", drive);
    if (codec) params.set("codec", codec);
    router.push(`/recordings?${params.toString()}`);
  };

  const clearFilters = () => {
    setQ("");
    setDrive("");
    setCodec("");
    router.push("/recordings");
  };

  return (
    <div className="flex flex-wrap gap-2 items-end">
      <div>
        <label className="text-xs text-muted-foreground">Search</label>
        <Input
          placeholder="Filename or notes..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-48"
          onKeyDown={(e) => e.key === "Enter" && applyFilters()}
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Drive</label>
        <Input
          placeholder="Drive name"
          value={drive}
          onChange={(e) => setDrive(e.target.value)}
          className="w-36"
          onKeyDown={(e) => e.key === "Enter" && applyFilters()}
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Codec</label>
        <Input
          placeholder="e.g. h264"
          value={codec}
          onChange={(e) => setCodec(e.target.value)}
          className="w-28"
          onKeyDown={(e) => e.key === "Enter" && applyFilters()}
        />
      </div>
      <Button onClick={applyFilters} size="sm">
        Filter
      </Button>
      <Button onClick={clearFilters} variant="ghost" size="sm">
        Clear
      </Button>
    </div>
  );
}
