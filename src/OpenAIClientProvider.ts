import OpenAI from "openai";

export class OpenAIClientProvider {
  private static _instance: OpenAI;

  public static provide(): OpenAI {
    if (this._instance) {
      return this._instance;
    }
    const openai = new OpenAI({ maxRetries: 2 });
    this._instance = openai;
    return openai;
  }
}
