import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
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

export const createNote = mutation({
  args: { title: v.string(), body: v.string() },
  returns: v.id("notes"),
  handler: async (ctx, args) => {
    const { title, body } = args;
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    return ctx.db.insert("notes", { title, body, userId });
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
  },
});
