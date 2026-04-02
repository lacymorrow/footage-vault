export const dynamic = "force-dynamic";
import { db } from "@/db";
import { people, peopleRecordings, recordings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Film } from "lucide-react";
import Link from "next/link";


function formatDuration(seconds: string | null): string {
  if (!seconds) return "-";
  const s = parseFloat(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const person = await db
    .select()
    .from(people)
    .where(eq(people.id, id))
    .limit(1);

  if (person.length === 0) notFound();
  const p = person[0];

  const linkedRecordings = await db
    .select({
      recording: recordings,
      source: peopleRecordings.source,
    })
    .from(peopleRecordings)
    .innerJoin(recordings, eq(peopleRecordings.recordingId, recordings.id))
    .where(eq(peopleRecordings.personId, id))
    .orderBy(desc(recordings.offloadedAt));

  // Group by year/month for timeline
  const grouped = new Map<string, typeof linkedRecordings>();
  for (const item of linkedRecordings) {
    const date = item.recording.offloadedAt
      ? new Date(item.recording.offloadedAt)
      : null;
    const key = date
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      : "Unknown";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  }

  return (
    <div className="space-y-6">
      <Link
        href="/people"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to people
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{p.name}</h1>
        {p.notes && <p className="text-muted-foreground">{p.notes}</p>}
        <p className="text-sm text-muted-foreground mt-1">
          {linkedRecordings.length} recording
          {linkedRecordings.length !== 1 ? "s" : ""}
        </p>
      </div>

      {linkedRecordings.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No recordings linked to this person.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([month, items]) => (
            <div key={month}>
              <h3 className="text-lg font-semibold mb-3 sticky top-0 bg-background py-1">
                {month}
              </h3>
              <div className="space-y-2 border-l-2 border-accent pl-4">
                {items.map((item) => (
                  <Link
                    key={item.recording.id}
                    href={`/recordings/${item.recording.id}`}
                  >
                    <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                      <CardContent className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <Film className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">
                              {item.recording.filename}
                            </p>
                            <div className="flex gap-1 mt-0.5">
                              {item.recording.codec && (
                                <Badge variant="secondary" className="text-xs">
                                  {item.recording.codec}
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {item.source}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <p>
                            {formatDuration(item.recording.durationSeconds)}
                          </p>
                          <p>{item.recording.destDrive ?? ""}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
