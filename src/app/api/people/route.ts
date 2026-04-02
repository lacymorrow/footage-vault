import { NextResponse } from "next/server";
import { db } from "@/db";
import { people, peopleRecordings } from "@/db/schema";
import { sql, eq, desc } from "drizzle-orm";
import { jsonError } from "@/lib/api";

export async function GET() {
  try {
    const result = await db
      .select({
        id: people.id,
        name: people.name,
        notes: people.notes,
        createdAt: people.createdAt,
        recordingCount: sql<number>`count(${peopleRecordings.id})::int`,
      })
      .from(people)
      .leftJoin(peopleRecordings, eq(peopleRecordings.personId, people.id))
      .groupBy(people.id)
      .orderBy(desc(people.createdAt));

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("People list error:", error);
    return jsonError("Internal server error", 500);
  }
}
