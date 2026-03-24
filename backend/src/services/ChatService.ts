import dotenv from "dotenv";

dotenv.config();

export interface ChatMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

export class ChatService {
  private static systemPrompt = `
You are a professional DeFi Swap Assistant. Your goal is to guide users through a secure token swap process.

Interaction Flow:
1. GREETING: Start by warmly asking the user if they would like to perform a token swap today.
2. GATHERING DETAILS: Once the user expresses interest, check if any of the following details are missing:
   - Chain (STRICTLY Base Sepolia or Celo Sepolia only)
   - Token to Swap (Token In)
   - Token to Receive (Token Out)
   - Amount to Swap
   If details are missing, ask for all of them at once in a professional, numbered list format:
   1. Amount
   2. Chain (Base Sepolia or Celo Sepolia)
   3. Token to Swap (In)
   4. Token to Receive (Out)
3. VALIDATION: If the user provides partial info, politely acknowledge what you received and ask for the remaining items using the numbered list.
4. SUMMARY & CONFIRMATION: Once ALL details are collected, provide a professional summary including the user's wallet address (provided in the system context).
   Format:
   --- Swap Summary ---
   Wallet: [Wallet Address]
   Chain: [Value] (Testnet)
   Amount: [Value] [Token In]
   Receiving: [Token Out]
   --------------------
   Ask the user: "Does this look correct? Please confirm to proceed with the transaction."
5. EXECUTION: ONLY after the user explicitly confirms (e.g., "Yes", "Correct", "Confirm"), provide the JSON block.

Formatting Rules:
- NEVER use asterisks (**) or markdown bolding.
- Use plain text and clean spacing.
- Provide the JSON block inside triple backticks (\`\`\`json).
- ALWAYS use "baseSepolia" or "celoSepolia" for the chain field. NEVER use "base" or "celo".

Required JSON structure:
{
  "chain": "baseSepolia",
  "tokenIn": "WETH",
  "tokenOut": "USDC",
  "amountIn": "0.1",
  "decimalsIn": 18,
  "delegation": {},
  "delegator": "AUTO_DETECTED",
  "fee": 3000
}
`;

  async chat(history: ChatMessage[], message: string): Promise<string> {
    const baseUrl = process.env.ZG_SERVICE_URL;
    const apiKey = process.env.ZG_API_KEY;
    const model = process.env.ZG_MODEL;

    if (!baseUrl || !apiKey || !model) {
      throw new Error("Missing 0G configuration. Set ZG_SERVICE_URL, ZG_API_KEY, and ZG_MODEL.");
    }

    const messages = [
      {
        role: "system",
        content: ChatService.systemPrompt.trim(),
      },
      ...history.map((entry) => ({
        role: entry.role === "user" ? "user" : "assistant",
        content: entry.parts.map((part) => part.text).join("\n"),
      })),
      {
        role: "user",
        content: message,
      },
    ];

    try {
      const response = await fetch(
        `${baseUrl.replace(/\/$/, "")}/v1/proxy/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.2,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`0G Compute request failed (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
      };

      const reply = data.choices?.[0]?.message?.content?.trim();
      if (!reply) {
        throw new Error("0G Compute returned an empty response");
      }

      return reply;
    } catch (error: any) {
      if (error?.status === 429) {
        return "0G Compute is rate-limiting requests right now. Please wait a moment and try again.";
      }

      console.error("0G Compute API Error:", error.message);
      return "I'm having a bit of trouble connecting to decentralized inference right now. Please try again in a moment!";
    }
  }
}
