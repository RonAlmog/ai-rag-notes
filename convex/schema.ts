import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,
  notes: defineTable({
    title: v.string(),
    body: v.string(),
    userId: v.id("users"),
  }).index("by_userId", ["userId"]),

  // here we store the embeddings, provided by openai,
  // for any given notes
  // https://platform.openai.com/docs/guides/embeddings
  noteEmbeddings: defineTable({
    content: v.string(),
    noteId: v.id("notes"),
    embedding: v.array(v.float64()),
    userId: v.id("users"),
  })
    .index("by_noteId", ["noteId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536, // default for openai
      filterFields: ["userId"],
    }),
});

export default schema;
