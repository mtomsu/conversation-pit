import { OpenAIClientProvider } from "./OpenAIClientProvider";
import fs from "fs";
import OpenAI from "openai";
import { PagePromise } from "openai/core.mjs";
import { RunSubmitToolOutputsParams } from "openai/resources/beta/threads/runs/runs.mjs";

function writeFile(args: { name: string; content: string }) {
  const { name, content } = args;
  console.info(`Writing file ${name} with content "${content}"...`);
  fs.writeFileSync(`../output/${name}`, content);
  return "success";
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createAssistantWithTools(): Promise<OpenAI.Beta.Assistant> {
  console.info(`Creating assistant...`);
  const client = OpenAIClientProvider.provide();
  const assistant = client.beta.assistants.create({
    model: "gpt-4-1106-preview",
    name: "Spanish Translator",
    instructions:
      "Translate input text from English to Spanish and write the translation to the file spanish.txt.",
    tools: [
      {
        type: "function",
        function: {
          name: "writeFile",
          description: "Write text to a file.",
          parameters: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Name of the file to write to.",
              },
              content: {
                type: "string",
                description: "Content to write to the file.",
              },
            },
            required: ["name", "content"],
          },
        },
      },
    ],
  });
  return assistant;
}

async function createAssistant(): Promise<OpenAI.Beta.Assistant> {
  console.info(`Creating assistant...`);
  const client = OpenAIClientProvider.provide();
  const assistant = client.beta.assistants.create({
    model: "gpt-4-1106-preview",
    name: "SRS Assistant",
    instructions:
      "Convert high level requirements into a software requirements specification (SRS) using markdown format.",
  });
  return assistant;
}

async function listAssistants(): Promise<OpenAI.Beta.Assistant[]> {
  console.info(`Listing assistants...`);
  const client = OpenAIClientProvider.provide();
  const assistantsPage = client.beta.assistants.list();
  const assistants = [];
  for await (const assistant of assistantsPage) {
    console.info(`Assistant: ${JSON.stringify(assistant)}`);
    assistants.push(assistant);
  }
  return assistants;
}

async function deleteAssistant(assistantId: string): Promise<void> {
  console.info(`Deleting assistant...`);
  const client = OpenAIClientProvider.provide();
  await client.beta.assistants.del(assistantId);
}

async function createThread(): Promise<OpenAI.Beta.Thread> {
  console.info(`Creating thread...`);
  const client = OpenAIClientProvider.provide();
  const thread = client.beta.threads.create();
  return thread;
}

async function retrieveThread(threadId: string): Promise<OpenAI.Beta.Thread> {
  console.info(`Retrieving thread...`);
  const client = OpenAIClientProvider.provide();
  const thread = client.beta.threads.retrieve(threadId);
  return thread;
}

async function deleteThread(threadId: string): Promise<void> {
  console.info(`Deleting thread...`);
  const client = OpenAIClientProvider.provide();
  await client.beta.threads.del(threadId);
}

async function createMessage(
  threadId: string,
  content: string
): Promise<OpenAI.Beta.Threads.Messages.ThreadMessage> {
  console.info(`Creating message...`);
  const client = OpenAIClientProvider.provide();
  const message = client.beta.threads.messages.create(threadId, {
    role: "user",
    content,
  });
  return message;
}

function listThreadMessages(
  threadId: string
): PagePromise<
  OpenAI.Beta.Threads.ThreadMessagesPage,
  OpenAI.Beta.Threads.ThreadMessage
> {
  console.info(`Getting thread messages...`);
  const client = OpenAIClientProvider.provide();
  const messages = client.beta.threads.messages.list(threadId);
  return messages;
}

async function createRun(
  assistantId: string,
  threadId: string
): Promise<OpenAI.Beta.Threads.Run> {
  console.info(`Creating assistant run...`);
  const client = OpenAIClientProvider.provide();
  const run = client.beta.threads.runs.create(threadId, {
    assistant_id: assistantId,
  });
  return run;
}

async function getRunStatus(
  threadId: string,
  runId: string
): Promise<OpenAI.Beta.Threads.Run> {
  console.info(`Getting assistant run...`);
  const client = OpenAIClientProvider.provide();
  const runStatus = client.beta.threads.runs.retrieve(threadId, runId);
  return runStatus;
}

async function waitForRunToComplete(
  threadId: string,
  runId: string
): Promise<void> {
  console.info(`Waiting for assistant run to complete...`);
  let isCompleted = false;
  while (!isCompleted) {
    await sleep(5000);

    const runStatus = await getRunStatus(threadId, runId);
    console.info(`Run status: ${JSON.stringify(runStatus)}`);

    switch (runStatus.status) {
      case "completed":
        const messages = await listThreadMessages(threadId);
        for (const message of messages.data) {
          const role = message.role;
          const content = message.content;
          console.info(`${role}: ${JSON.stringify(content)}`);
        }
        isCompleted = true;
        break;

      case "requires_action":
        const actions =
          runStatus.required_action?.submit_tool_outputs.tool_calls ?? [];
        console.info(`Action: ${JSON.stringify(actions)}`);
        const toolsOutput: RunSubmitToolOutputsParams.ToolOutput[] = [];
        for (const action of actions) {
          const functionName = action.function.name;
          const args = JSON.parse(action.function.arguments);
          console.info(
            `Function: ${functionName}, Args: ${JSON.stringify(args)}`
          );
          if (functionName === "writeFile") {
            const output = writeFile(args);
            toolsOutput.push({
              tool_call_id: action.id,
              output,
            });
          } else {
            console.error(`Unknown function: ${functionName}`);
          }
        }
        await submitToolOutputs(threadId, runId, toolsOutput);
        break;

      default:
        console.warn(`Unhandled status: ${runStatus.status}`);
        break;
    }
  }
}

async function submitToolOutputs(
  threadId: string,
  runId: string,
  toolCalls: RunSubmitToolOutputsParams.ToolOutput[]
): Promise<OpenAI.Beta.Threads.Run> {
  console.info(`Submitting tool outputs...`);
  const client = OpenAIClientProvider.provide();
  const run = client.beta.threads.runs.submitToolOutputs(threadId, runId, {
    tool_outputs: toolCalls,
  });
  return run;
}

async function main() {
  const assistantId = "asst_lejr1cJygJTvL3GViRn8PV9v";
  const threadId = "thread_ZzdN8mqpSDZTw6e1SxXhdkTu";

  //const assistant = await createSRSAssistant();
  //const assistantId = assistant.id;
  //console.info(`Assistant: ${JSON.stringify(assistant)}`);

  //const thread = await createThread();
  //const threadId = thread.id;
  //console.info(`Thread: ${JSON.stringify(thread)}`);

  //const message = await createMessage(thread.id, "A web app to manage todos");
  const message = await createMessage(
    threadId,
    "Please provide an easily parseable response including a filename (SRS.md) and the content of the file."
  );
  console.info(`Message: ${JSON.stringify(message)}`);

  const run = await createRun(assistantId, threadId);
  const runId = run.id;
  console.info(`Run: ${JSON.stringify(run)}`);

  await waitForRunToComplete(threadId, runId);
}

main();
