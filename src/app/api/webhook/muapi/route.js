import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AIService } from "@/lib/services/ai";

export async function POST(req) {
  try {
    const data = await req.json();
    const requestId = data.id || data.request_id;

    if (!requestId) {
      return NextResponse.json({ error: "Missing request_id" }, { status: 400 });
    }

    const creation = await prisma.characterStudioCreation.findUnique({
      where: { requestId }
    });

    if (!creation) {
      return NextResponse.json({ error: "Creation not found" }, { status: 404 });
    }

    // If it's already completed or failed, return early
    if (creation.status === "completed" || creation.status === "failed") {
      return NextResponse.json({ success: true, message: "Already processed" });
    }

    if (data.error) {
      console.warn("MuAPI webhook reports failure:", data.error);
      await AIService.failCharacterCreation(creation, data.error);
    } else {
      const outputs = data.outputs || [];
      const avatarImage = outputs[0] || (typeof data.output === "string" ? data.output : data.output?.image || data.output?.urls?.get);

      if (!avatarImage) {
        console.error("MuAPI webhook output is empty");
        await AIService.failCharacterCreation(creation, "Empty output from model");
      } else {
        await AIService.completeCharacterCreation(creation, avatarImage);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[MUAPI_WEBHOOK_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
