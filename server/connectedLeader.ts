import { ENV } from "./_core/env";
import { parseMerchantCommands } from "@shared/merchantAssistant";
import { resolveLocalLeaderPlan } from "@shared/localLeader";

export type ConnectedLeaderSource = "gemini-flash" | "gemini-flash-lite" | "local-fallback";

export type ConnectedLeaderReply = {
  reply: string;
  source: ConnectedLeaderSource;
  usedFallback: boolean;
};

const GEMINI_MODELS: Array<{ id: string; source: Exclude<ConnectedLeaderSource, "local-fallback">; thinkingLevel?: "LOW" }> = [
  { id: "gemini-flash-latest", source: "gemini-flash", thinkingLevel: "LOW" },
  { id: "gemini-flash-lite-latest", source: "gemini-flash-lite" },
];

function localFallback(message: string): ConnectedLeaderReply {
  const commands = parseMerchantCommands(message);
  const plan = resolveLocalLeaderPlan(message, commands);
  return {
    reply: `تعذر الوصول إلى القائد المتصل الآن، لذلك أكمل القائد المحلي معك: ${plan.reply}`,
    source: "local-fallback",
    usedFallback: true,
  };
}

function buildPrompt(message: string) {
  return `أنت القائد الذكي لتطبيق شخصي تعليمي يصمم صوراً للملابس على الهاتف. أجب بالعربية الدافئة والواضحة. ركز أولاً على: تجهيز صورة القطعة، جودة القالب، العنوان، الشعار، التذييل، والخطوات العملية داخل التطبيق. يمكنك تقديم نصائح وخطة قصيرة عند الطلب، لكن لا تدّعِ أنك نفذت تغييراً أو رأيت صورة لم تُرسل إليك. لا تطلب مفاتيح أو معلومات خاصة، ولا تقترح شراء خدمة كشرط. إذا كان الطلب يتضمن تغييراً في القالب، صف التغيير بصورة موجزة واذكر أنه يحتاج تأكيد المستخدم قبل التطبيق.

رسالة المستخدم:
${message}`;
}

async function askGemini(model: string, message: string, thinkingLevel?: "LOW"): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(ENV.geminiApiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(message) }] }],
        generationConfig: {
          temperature: 0.55,
          maxOutputTokens: 900,
          ...(thinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}),
        },
      }),
      signal: AbortSignal.timeout(12_000),
    }
  );
  if (!response.ok) throw new Error(`Gemini returned ${response.status}`);
  const payload = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = payload.candidates?.[0]?.content?.parts?.map(part => part.text ?? "").join("\n").trim();
  if (!text) throw new Error("Gemini returned an empty reply");
  return text.slice(0, 4_000);
}

export async function getConnectedLeaderReply(message: string): Promise<ConnectedLeaderReply> {
  if (!ENV.geminiApiKey) return localFallback(message);
  for (const candidate of GEMINI_MODELS) {
    try {
      const reply = await askGemini(candidate.id, message, candidate.thinkingLevel);
      return { reply, source: candidate.source, usedFallback: candidate.source !== "gemini-flash" };
    } catch {
      // Try the independent model tier before returning the always-available local leader.
    }
  }
  return localFallback(message);
}
