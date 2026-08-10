import { api } from "./client";

export type AgentChatRequest = {
  message: string;
  session_id?: string;
  app_name?: string;
};

export type AgentChatResponse = {
  session_id: string;
  response: string;
  raw_events: unknown[];
};

export async function chatWithAgent(payload: AgentChatRequest): Promise<AgentChatResponse> {
  const { data } = await api.post<AgentChatResponse>("/agent/chat", {
    app_name: "file_agent",
    ...payload,
  });
  return data;
}
