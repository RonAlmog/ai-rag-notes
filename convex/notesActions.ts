"use node";

// why do we need this?
// because for creating the embedding we need to call generateEmbeddings,
// that is using @ai-sdk/openai. this is not possible from convex.
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { generateEmbedding, generateEmbeddings } from "../src/lib/embeddings";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

export const createNote = action({
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

// internalAction can only be called from within other convex actions, not from frontend.
export const findRelevantNotes = internalAction({
  args: {
    userId: v.id("users"),
    query: v.string(),
  },
  handler: async (ctx, args): Promise<Array<Doc<"notes">>> => {
    const { userId, query } = args;

    const embedding = await generateEmbedding(query);

    // now lets do a vector search
    const results = await ctx.vectorSearch("noteEmbeddings", "by_embedding", {
      vector: embedding,
      limit: 16,
      filter: (q) => q.eq("userId", userId),
    });

    console.log("Vector search results:", results);

    // take only meaningful results
    const resultsAboveThreshold = results.filter(
      (result) => result._score > 0.3
    );

    const embeddingIds = resultsAboveThreshold.map((result) => result._id);

    const notes = await ctx.runQuery(internal.notes.fetchNotesByEmbeddingIds, {
      embeddingIds,
    });

    return notes;
  },
});
