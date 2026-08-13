import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type InitResponse = {
  conversation_config_override?: {
    agent?: { first_message?: string };
  };
  dynamic_variables?: Record<string, string>;
};

function persistenceUrl() {
  return (process.env.PERSISTENCE_API_URL || "http://localhost:8000").replace(
    /\/$/,
    ""
  );
}

function agentId() {
  return (
    process.env.ELEVENLABS_AGENT_ID ||
    process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ||
    ""
  );
}

async function fetchInit(phone: string): Promise<InitResponse> {
  if (!phone) return {};
  try {
    const response = await fetch(
      `${persistenceUrl()}/webhooks/elevenlabs/init`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caller_id: phone, call_sid: `web_${Date.now()}` }),
      }
    );
    if (!response.ok) return {};
    return (await response.json()) as InitResponse;
  } catch {
    return {};
  }
}

async function fetchConversationToken(id: string, apiKey: string) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(id)}`,
    { headers: { "xi-api-key": apiKey } }
  );
  if (!response.ok) return null;
  const body = (await response.json()) as { token?: string };
  return body.token || null;
}

async function fetchSignedUrl(id: string, apiKey: string) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(id)}`,
    { headers: { "xi-api-key": apiKey } }
  );
  if (!response.ok) return null;
  const body = (await response.json()) as { signed_url?: string };
  return body.signed_url || null;
}

export async function GET(request: Request) {
  const phone = new URL(request.url).searchParams.get("phone") || "";
  const id = agentId();
  const apiKey = process.env.ELEVENLABS_API_KEY || "";
  const publicAgentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || "";

  if (!id && !publicAgentId) {
    return NextResponse.json(
      {
        error:
          "ElevenLabs is not configured. Set ELEVENLABS_AGENT_ID and ELEVENLABS_API_KEY.",
      },
      { status: 503 }
    );
  }

  const init = await fetchInit(phone);
  const firstMessage =
    init.conversation_config_override?.agent?.first_message || "";
  const dynamicVariables = init.dynamic_variables || {};

  if (apiKey && id) {
    // Prefer the signed WebSocket URL. Conversation tokens use LiveKit WebRTC,
    // which currently dies in this SDK with "createOffer with closed peer connection".
    const signedUrl = await fetchSignedUrl(id, apiKey);
    if (signedUrl) {
      return NextResponse.json({
        signedUrl,
        firstMessage,
        dynamicVariables,
      });
    }
    const conversationToken = await fetchConversationToken(id, apiKey);
    if (conversationToken) {
      return NextResponse.json({
        conversationToken,
        firstMessage,
        dynamicVariables,
      });
    }
    return NextResponse.json(
      { error: "Could not authorize the ElevenLabs agent." },
      { status: 502 }
    );
  }

  if (publicAgentId) {
    return NextResponse.json({
      agentId: publicAgentId,
      firstMessage,
      dynamicVariables,
    });
  }

  return NextResponse.json(
    {
      error:
        "Private agents need ELEVENLABS_API_KEY. Public agents can use NEXT_PUBLIC_ELEVENLABS_AGENT_ID.",
    },
    { status: 503 }
  );
}
