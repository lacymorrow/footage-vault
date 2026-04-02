export const dynamic = "force-dynamic";
import { db } from "@/db";
import { people, peopleRecordings } from "@/db/schema";
import { sql, eq, desc } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";
import Link from "next/link";


export default async function PeoplePage() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">People</h1>
        <p className="text-muted-foreground">
          {result.length} {result.length === 1 ? "person" : "people"} in the
          database
        </p>
      </div>

      {result.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No people linked to recordings yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {result.map((p) => (
            <Link key={p.id} href={`/people/${p.id}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                      <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {p.recordingCount} recording
                        {p.recordingCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  {p.notes && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {p.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
