import { openai } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";

const embeddingModel = openai.embedding("text-embedding-3-small");

// in order to be more granular and precise with the embeddings,
// we separate the text into chunks, basically paragraphs.
// and then generate embedding for each one.
function generateChunks(input: string): string[] {
  return input
    .split("\n\n")
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

// openai will generate the embedding for us.
// the input will be a string, and the result is array of numbers.
// https://platform.openai.com/docs/guides/embeddings
// we save those embeddings as array of number for each chunk.
// because we have several chunks per note, the return type
// is an array of {string, number[]}
export async function generateEmbeddings(
  input: string
): Promise<Array<{ content: string; embedding: number[] }>> {
  const chunks = generateChunks(input);

  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunks,
  });

  return embeddings.map((embedding, index) => ({
    content: chunks[index],
    embedding,
  }));
}

// generate single embedding
// we need this for our chat queries.
// the result of this will be compared to our user notes embeddings,
// to find similarities
export async function generateEmbedding(value: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel,
    value,
  });
  return embedding;
}
