export const dynamic = "force-dynamic";
import { db } from "@/db";
import { recordings, transcripts, peopleRecordings, people } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { ArrowLeft, User, FileText } from "lucide-react";


function formatBytes(bytes: number | null): string {
  if (!bytes) return "-";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

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

export default async function RecordingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const recording = await db
    .select()
    .from(recordings)
    .where(eq(recordings.id, id))
    .limit(1);

  if (recording.length === 0) notFound();
  const r = recording[0];

  const transcript = await db
    .select()
    .from(transcripts)
    .where(eq(transcripts.recordingId, id));

  const linkedPeople = await db
    .select({
      id: people.id,
      name: people.name,
      source: peopleRecordings.source,
    })
    .from(peopleRecordings)
    .innerJoin(people, eq(peopleRecordings.personId, people.id))
    .where(eq(peopleRecordings.recordingId, id));

  return (
    <div className="space-y-6">
      <Link
        href="/recordings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to recordings
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{r.filename}</h1>
        <p className="text-muted-foreground text-sm font-mono">{r.filePath}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <MetaRow label="Duration" value={formatDuration(r.durationSeconds)} />
            <MetaRow label="Codec" value={r.codec} />
            <MetaRow label="Resolution" value={r.resolution} />
            <MetaRow label="FPS" value={r.fps} />
            <MetaRow label="Container" value={r.container} />
            <MetaRow label="File Size" value={formatBytes(r.fileSize)} />
            <MetaRow
              label="File Created"
              value={r.fileCreatedAt ? new Date(r.fileCreatedAt).toLocaleString() : null}
            />
            <MetaRow
              label="Offloaded"
              value={r.offloadedAt ? new Date(r.offloadedAt).toLocaleString() : null}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Drive Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <MetaRow label="Source Drive" value={r.sourceDrive} />
            <MetaRow label="Destination Drive" value={r.destDrive} />
            <Separator />
            <MetaRow label="Checksum (SHA-256)" value={r.checksum} />
            {r.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{r.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {linkedPeople.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-4 w-4" />
              Linked People
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {linkedPeople.map((p) => (
                <Link key={p.id} href={`/people/${p.id}`}>
                  <Badge variant="secondary" className="cursor-pointer hover:bg-accent">
                    {p.name}
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({p.source})
                    </span>
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {transcript.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Transcript
              {transcript[0].language && (
                <Badge variant="outline">{transcript[0].language}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {transcript[0].fullText ?? "No transcript text available."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value ?? "-"}</span>
    </div>
  );
}
