import OpenAI from "openai";

const OPENAI_MODEL = "gpt-3.5-turbo"; // gpt-4

const openai = new OpenAI({ maxRetries: 2 });

async function main() {
  const stream = await openai.chat.completions.create(
    {
      model: OPENAI_MODEL,
      messages: [{ role: "user", content: "Say this is a test" }],
      stream: true,
    },
    {
      maxRetries: 2,
    }
  );
  for await (const chunk of stream) {
    console.info(chunk.choices[0]?.delta?.content || "");
  }
}

main();
