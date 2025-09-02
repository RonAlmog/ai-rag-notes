"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { generateEmbeddings } from "../src/lib/embeddings";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const createNone = action({
  args: {
    title: v.string(),
    body: v.string(),
  },
  returns: v.id("notes"),
  handler: async (ctx, args) => {
    const { title, body } = args;

    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const text = `${title}\n\n${body}`;
    const embeddings = await generateEmbeddings(text);

    const noteId: Id<"notes"> = await ctx.runMutation(
      internal.notes.createNoteWithEmbeddings,
      {
        title,
        body,
        userId,
        embeddings,
      }
    );
    return noteId;
  },
});
