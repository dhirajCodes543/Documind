const { PrismaClient } = require("../generated/prisma");
const { generateEmbedding } = require("../utils/embedding");
const { generateResponse } = require("../utils/gemini");

const prisma = new PrismaClient();

async function getChatHistory(userId) {
  const chats = await prisma.chat.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      documents: {
        select: { id: true, filename: true, createdAt: true, path: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return chats.map((chat) => ({
    id: chat.id,
    title: chat.documents[0]?.filename ?? "Untitled",
    createdAt: chat.createdAt,
    documents: chat.documents.map((d) => ({
      id: d.id,
      filename: d.filename,
      isYoutube: d.path?.startsWith("youtube:") ?? false,
      isWebsite: d.path?.startsWith("web:") ?? false,
    })),
  }));
}

async function getChatMessages(chatId, userId) {
  const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
  if (!chat) throw new Error("Chat not found");

  return prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, content: true, createdAt: true },
  });
}

async function buildContext(chatId, message) {
  const [previousMessages, chatDocuments, queryEmbedding] = await Promise.all([
    prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { role: true, content: true },
    }),
    prisma.document.findMany({
      where: { chatId },
      select: { filename: true, path: true },
      orderBy: { createdAt: "asc" },
    }),
    generateEmbedding(message),
  ]);

  const vectorString = `[${queryEmbedding.join(",")}]`;

  const relevantChunks = await prisma.$queryRaw`
    SELECT content FROM "Chunk"
    WHERE "chatId" = ${chatId}
    ORDER BY embedding <-> CAST(${vectorString} AS vector)
    LIMIT 5
  `;

  const context = relevantChunks.map((c) => c.content).join("\n\n");

  const documentList = chatDocuments
    .map((d, i) => {
      let type = "PDF Document";
      if (d.path?.startsWith("youtube:")) type = "YouTube Video Transcript";
      if (d.path?.startsWith("web:")) type = "Website Page";
      return `${i + 1}. ${d.filename} (${type})`;
    })
    .join("\n");

  const historyText = previousMessages
    .reverse()
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  return { context, documentList, historyText };
}

async function sendMessage({ chatId, message, userId }) {
  const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
  if (!chat) throw new Error("Chat not found");

  const { context, documentList, historyText } = await buildContext(
    chatId,
    message
  );

  const prompt = `
You are DocuMind 🧠 — a brilliant, warm, and witty AI assistant who lives inside documents and loves helping people understand them deeply.

Your personality:
- You're sharp, friendly, and a little playful — like a brilliant friend who actually read everything
- You use emojis naturally and sparingly — only where they add warmth or punch 🎯
- You're confident but never robotic — you talk like a human, not a manual
- You adapt to the user's energy — casual with casual, sharp with sharp

Your sources (in order of upload):
${documentList}

Note: For YouTube sources, the source name listed above IS the video title. If asked about the video title, answer directly using the source name above — do not say you cannot find it.

Your absolute rules:
1. ONLY answer from the context below — no outside knowledge, ever
2. Refer to sources correctly based on their type:
   - "YouTube Video Transcript" → say "in the video", "the speaker says", "the video is titled X"
   - "PDF Document" → say "in the document", "the text mentions"
   - "Website Page" → say "on the website", "the page mentions", "according to the site"
   - Mixed → refer to each by name e.g. "In [video name]..." or "The document [name] mentions..."
   - Each chunk is prefixed with [Source: filename] so you can always tell which source it came from
3. If user asks about a SPECIFIC source by name or number — answer ONLY from that source's chunks
4. If user asks "what sources do you have?" or "what is the video title?" or "what is the document name?" — answer directly using the sources list above
5. If the answer isn't in the sources at all — say: "I looked everywhere and couldn't find that one 🔍 Try rephrasing or ask something else!"
6. ALLOWED small talk — "what are you?", "how do you work?", "what can you do?" — answer warmly and briefly as DocuMind
7. HARD OFF-TOPIC rule — anything unrelated to the sources AND not about DocuMind — deflect warmly:
   - "Haha that's way outside my world 😄 I only know what's in your sources!"
   - "I'm a document nerd, not a news anchor 📰 Ask me something from your files!"
8. For follow-ups, use chat history — never make the user repeat themselves
9. Format cleanly — bullets and bold only when they genuinely help, never by default
10. Never say "based on the context provided" — weave it in naturally

--- Sources Context (relevant excerpts with source labels) ---
${context}

--- Chat History (last 10 messages) ---
${historyText}

--- Current Question ---
User: ${message}
Assistant:`;

  const reply = await generateResponse(prompt);

  await prisma.$transaction([
    prisma.message.create({
      data: { chatId, role: "user", content: message },
    }),
    prisma.message.create({
      data: { chatId, role: "assistant", content: reply },
    }),
  ]);

  return reply;
}

module.exports = { getChatHistory, getChatMessages, sendMessage, buildContext };