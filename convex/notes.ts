import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getUserNotes = query({
  args: {},

  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    return ctx.db
      .query("notes")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// internal mutation can only be called internally, not from front end.
// for the operation, we will call the 'action', and it will call this
export const createNoteWithEmbeddings = internalMutation({
  args: {
    title: v.string(),
    body: v.string(),
    userId: v.id("users"),
    embeddings: v.array(
      v.object({
        embedding: v.array(v.float64()),
        content: v.string(),
      })
    ),
  },
  returns: v.id("notes"),
  handler: async (ctx, args) => {
    const { title, body, userId, embeddings } = args;

    const noteId = await ctx.db.insert("notes", { title, body, userId });

    for (const embeddingData of embeddings) {
      await ctx.db.insert("noteEmbeddings", {
        embedding: embeddingData.embedding,
        content: embeddingData.content,
        noteId,
        userId,
      });
    }

    return noteId;
  },
});

export const deleteNote = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const note = await ctx.db.get(args.noteId);
    if (!note) throw new Error("Note not found");

    if (note.userId !== userId) throw new Error("Unauthorized");

    await ctx.db.delete(args.noteId);

    // delete the embeddings as well
    const embeddings = await ctx.db
      .query("noteEmbeddings")
      .withIndex("by_noteId", (q) => q.eq("noteId", args.noteId))
      .collect();

    for (const embedding of embeddings) {
      await ctx.db.delete(embedding._id);
    }
  },
});

export const fetchNotesByEmbeddingIds = internalQuery({
  args: {
    embeddingIds: v.array(v.id("noteEmbeddings")),
  },
  handler: async (ctx, args) => {
    const { embeddingIds } = args;

    // a quick single query would be nice here, but convex does not have "in" operator.
    const embeddings = [];
    for (const id of embeddingIds) {
      const embedding = await ctx.db.get(id);
      if (embedding) embeddings.push(embedding);
    }

    // in case multimple embeddings point to the same note,
    // (because they are parts of the same note),
    // we use a Set to get unique note IDs
    const uniqueNoteIds = [...new Set(embeddings.map((e) => e.noteId))];

    // we could optimize this by fetching all notes in a single query.
    // but sadly convex doesn't support querying by multiple IDs yet
    const results = [];
    for (const id of uniqueNoteIds) {
      const note = await ctx.db.get(id);
      if (note) results.push(note);
    }

    return results;
  },
});
