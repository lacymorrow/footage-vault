import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recordings, transcripts, peopleRecordings, people } from "@/db/schema";
import { eq } from "drizzle-orm";
import { jsonError } from "@/lib/api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const recording = await db
      .select()
      .from(recordings)
      .where(eq(recordings.id, id))
      .limit(1);

    if (recording.length === 0) {
      return jsonError("Recording not found", 404);
    }

    const transcript = await db
      .select()
      .from(transcripts)
      .where(eq(transcripts.recordingId, id));

    const linkedPeople = await db
      .select({
        id: people.id,
        name: people.name,
        notes: people.notes,
        source: peopleRecordings.source,
      })
      .from(peopleRecordings)
      .innerJoin(people, eq(peopleRecordings.personId, people.id))
      .where(eq(peopleRecordings.recordingId, id));

    return NextResponse.json({
      ...recording[0],
      transcript: transcript[0] ?? null,
      people: linkedPeople,
    });
  } catch (error) {
    console.error("Recording detail error:", error);
    return jsonError("Internal server error", 500);
  }
}
