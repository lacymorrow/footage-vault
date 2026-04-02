import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recordings, transcripts } from "@/db/schema";
import { ilike, or, desc, eq } from "drizzle-orm";
import { jsonError } from "@/lib/api";

type MatchSource = "recording" | "transcript" | "both";

interface SearchResult {
  recording: typeof recordings.$inferSelect;
  matchSource: MatchSource;
  matchContext: string | null;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q");
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20")));

    if (!q || q.trim().length === 0) {
      return jsonError("Query parameter 'q' is required", 400);
    }

    const term = `%${q}%`;

    // Search recordings by filename and notes
    const recordingResults = await db
      .select()
      .from(recordings)
      .where(
        or(
          ilike(recordings.filename, term),
          ilike(recordings.notes, term)
        )
      )
      .orderBy(desc(recordings.offloadedAt))
      .limit(limit);

    // Search transcripts
    const transcriptResults = await db
      .select({
        transcript: transcripts,
        recording: recordings,
      })
      .from(transcripts)
      .innerJoin(recordings, eq(transcripts.recordingId, recordings.id))
      .where(ilike(transcripts.fullText, term))
      .limit(limit);

    // Merge and deduplicate
    const seen = new Set<string>();
    const results: SearchResult[] = [];

    for (const r of recordingResults) {
      seen.add(r.id);
      results.push({
        recording: r,
        matchSource: "recording" as const,
        matchContext: null,
      });
    }

    for (const { transcript, recording } of transcriptResults) {
      const context = extractContext(transcript.fullText ?? "", q, 100);
      if (seen.has(recording.id)) {
        const existing = results.find((r) => r.recording.id === recording.id);
        if (existing) {
          existing.matchSource = "both";
          existing.matchContext = context;
        }
        continue;
      }
      seen.add(recording.id);
      results.push({
        recording,
        matchSource: "transcript" as const,
        matchContext: context,
      });
    }

    return NextResponse.json({ query: q, results, total: results.length });
  } catch (error) {
    console.error("Search error:", error);
    return jsonError("Internal server error", 500);
  }
}

function extractContext(
  text: string,
  query: string,
  contextChars: number
): string | null {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return null;
  const start = Math.max(0, idx - contextChars);
  const end = Math.min(text.length, idx + query.length + contextChars);
  let snippet = text.slice(start, end);
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";
  return snippet;
}
