import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { convertToModelMessages, streamText, UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/api/chat",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { messages }: { messages: UIMessage[] } = await req.json();
    const lastMessages = messages.slice(-5);

    const result = streamText({
      model: openai("gpt-3.5-turbo"), // gpt-4o-mini
      system: "You are a helpful assistant.",
      messages: convertToModelMessages(lastMessages),
      onError: (error) => {
        console.error("Error occurred while streaming text:", error);
      },
    });
    return result.toUIMessageStreamResponse();
  }),
});

export default http;
