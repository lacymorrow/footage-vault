import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { people, peopleRecordings, recordings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { jsonError } from "@/lib/api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const person = await db
      .select()
      .from(people)
      .where(eq(people.id, id))
      .limit(1);

    if (person.length === 0) {
      return jsonError("Person not found", 404);
    }

    const linkedRecordings = await db
      .select({
        recording: recordings,
        source: peopleRecordings.source,
      })
      .from(peopleRecordings)
      .innerJoin(recordings, eq(peopleRecordings.recordingId, recordings.id))
      .where(eq(peopleRecordings.personId, id))
      .orderBy(desc(recordings.offloadedAt));

    return NextResponse.json({
      ...person[0],
      recordings: linkedRecordings.map((r) => ({
        ...r.recording,
        linkSource: r.source,
      })),
    });
  } catch (error) {
    console.error("Person detail error:", error);
    return jsonError("Internal server error", 500);
  }
}
