import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiKey, jsonError } from "@/lib/api";

const transcribeSchema = z.object({
  recording_id: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const authError = requireApiKey(req);
    if (authError) return authError;

    const body = await req.json();
    const parsed = transcribeSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(`Invalid input: ${parsed.error.message}`, 400);
    }

    return NextResponse.json(
      { message: "Transcription not yet implemented. Coming soon." },
      { status: 501 }
    );
  } catch (error) {
    console.error("Transcribe error:", error);
    return jsonError("Internal server error", 500);
  }
}
