import { prisma } from "../prisma";
import { UserService } from "./user";
import config from "../config";

const FALLBACK_AVATARS = {
  anime: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=600",
  cyberpunk: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=600",
  cinematic: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600",
  pixar: "https://images.unsplash.com/photo-1620428268482-cf1851a36764?auto=format&fit=crop&q=80&w=600",
  oil_painting: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=600",
  digital_art: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=600"
};

export const AIService = {
  async generateCharacter(userId, { prompt, aspectRatio = "1:1", resolution = "1k", inputImage = null }) {
    const cost = resolution === "4k" ? 36 : 24;

    // 1. Deduct credits first
    await UserService.deductCredits(userId, cost);

    const apiKey = config.ai.apiKey;
    if (!apiKey || apiKey.includes("your_") || apiKey.trim() === "") {
      console.warn("MU_API_KEY is not configured or invalid. Falling back to local Mock Character Studio Generation.");
      // Create mock creation directly
      const request_id = `mock_${Date.now()}`;
      const creation = await prisma.characterStudioCreation.create({
        data: {
          userId,
          name: "Assembling...",
          backstory: prompt,
          style: "custom",
          personality: "custom",
          inputImage,
          aspectRatio,
          resolution,
          status: "processing",
          requestId: request_id,
          creditCost: cost,
        }
      });
      return creation;
    }

    // 2. Submit Character Image Prediction to MuAPI directly to nano-banana-pro or nano-banana-pro-edit
    const modelType = inputImage ? "nano-banana-pro-edit" : "nano-banana-pro";

    try {
      const webhookUrl = `${config.auth.webhook_url}/api/webhook/muapi`;
      const submitUrl = `https://api.muapi.ai/api/v1/${modelType}?webhook=${encodeURIComponent(webhookUrl)}`;

      const inputPayload = {
        prompt,
        aspect_ratio: aspectRatio,
        resolution
      };

      if (inputImage) {
        inputPayload.images_list = [inputImage];
      }

      const submitRes = await fetch(submitUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey
        },
        body: JSON.stringify(inputPayload)
      });

      if (!submitRes.ok) {
        const errorText = await submitRes.text();
        throw new Error(`MuAPI submission failed: ${submitRes.status} ${errorText}`);
      }

      const resJson = await submitRes.json();
      const requestId = resJson.request_id || resJson.id;
      if (!requestId) {
        throw new Error("No request_id received from MuAPI");
      }

      // Create the creation record in 'processing' status
      const creation = await prisma.characterStudioCreation.create({
        data: {
          userId,
          name: "Assembling...",
          backstory: prompt,
          style: "custom",
          personality: "custom",
          inputImage,
          aspectRatio,
          resolution,
          status: "processing",
          requestId,
          creditCost: cost,
        }
      });

      return creation;
    } catch (err) {
      console.warn("AI creation pipeline failed. Falling back to local Mock Character Generation. Error:", err.message);
      const request_id = `mock_fallback_${Date.now()}`;
      const creation = await prisma.characterStudioCreation.create({
        data: {
          userId,
          name: "Assembling...",
          backstory: prompt,
          style: "custom",
          personality: "custom",
          inputImage,
          aspectRatio,
          resolution,
          status: "processing",
          requestId: request_id,
          creditCost: cost,
        }
      });
      return creation;
    }
  },

  async completeCharacterCreation(creation, avatarImage) {
    let name = "Custom Character";
    let greeting = `Hello, I am a new companion. Ask me anything!`;
    let systemPrompt = `You are a custom AI companion. Backstory: ${creation.backstory}.`;

    const apiKey = config.ai.apiKey;
    if (apiKey && !apiKey.includes("your_") && apiKey.trim() !== "") {
      try {
        const sysPromptStr = `You are a character designer. Your task is to generate a suitable short Name, a custom Greeting dialogue, and a concise System Prompt (guiding future chat conversations) based on the user's prompt description.
Respond strictly in JSON format (do not include markdown code block wraps) with this structure:
{
  "name": "A short, fitting character name (e.g. Eldrin, Nova-7, etc.)",
  "greeting": "A high-fidelity introductory greeting dialogue reflecting the character's speech patterns",
  "systemPrompt": "Instructions guiding an LLM on how to play this persona"
}`;
        const userPromptStr = `User prompt: ${creation.backstory}`;

        const textRes = await fetch("https://api.muapi.ai/api/v1/any-llm-models", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey
          },
          body: JSON.stringify({
            prompt: userPromptStr,
            system_prompt: sysPromptStr,
            model: "google/gemini-2.5-flash",
            reasoning: false,
            priority: "throughput",
            temperature: 0.7,
            max_tokens: null
          })
        });

        if (textRes.ok) {
          const textJson = await textRes.json();
          const textOutput = textJson.outputs?.[0] || textJson.output || "";
          if (textOutput) {
            let jsonStr = textOutput.trim();
            if (jsonStr.startsWith("```json")) jsonStr = jsonStr.substring(7);
            if (jsonStr.startsWith("```")) jsonStr = jsonStr.substring(3);
            if (jsonStr.endsWith("```")) jsonStr = jsonStr.substring(0, jsonStr.length - 3);
            jsonStr = jsonStr.trim();

            const parsed = JSON.parse(jsonStr);
            if (parsed.name) name = parsed.name;
            if (parsed.greeting) greeting = parsed.greeting;
            if (parsed.systemPrompt) systemPrompt = parsed.systemPrompt;
          }
        }
      } catch (textErr) {
        console.warn("LLM dialog call failed, using default text prompts:", textErr.message);
      }
    } else {
      // Mock name generation
      name = `Companion ${Math.floor(Math.random() * 1000)}`;
      greeting = `Greetings, traveller. I am ${name}. Ask me anything you want!`;
      systemPrompt = `You are ${name}. Talk in a friendly tone of voice.`;
    }

    const updated = await prisma.characterStudioCreation.update({
      where: { id: creation.id },
      data: {
        name,
        avatarImage,
        greeting,
        systemPrompt,
        status: "completed"
      }
    });

    return updated;
  },

  async failCharacterCreation(creation, errorMsg) {
    const updated = await prisma.characterStudioCreation.update({
      where: { id: creation.id },
      data: {
        status: "failed",
        error: errorMsg || "Generation failed"
      }
    });

    // Refund credits
    await UserService.addCredits(creation.userId, creation.creditCost);
    return updated;
  },

  async checkStatus(requestId) {
    const creation = await prisma.characterStudioCreation.findUnique({
      where: { requestId }
    });

    if (!creation) return null;

    if (creation.status === "completed") {
      return { status: "completed", creation };
    }

    if (creation.status === "failed") {
      return { status: "failed", error: creation.error || "Generation failed" };
    }

    const apiKey = config.ai.apiKey;

    // Check if it's a mock request
    if (requestId && requestId.startsWith("mock_")) {
      const elapsed = Date.now() - new Date(creation.createdAt).getTime();
      if (elapsed < 3000) {
        return { status: "processing" };
      }

      // If reference inputImage is present, use it as fallback mock avatar, else pick fallback style key
      let avatarImage = creation.inputImage;
      if (!avatarImage) {
        const styleKey = Object.keys(FALLBACK_AVATARS)[Math.floor(Math.random() * Object.keys(FALLBACK_AVATARS).length)];
        avatarImage = FALLBACK_AVATARS[styleKey];
      }

      const updated = await this.completeCharacterCreation(creation, avatarImage);
      return { status: "completed", creation: updated };
    }

    if (!apiKey) throw new Error("MU_API_KEY is not configured");

    try {
      // 1. Poll the Image predictions endpoint
      const res = await fetch(`https://api.muapi.ai/api/v1/predictions/${requestId}/result`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey
        }
      });

      if (!res.ok) {
        console.error("Polling endpoint returned error:", res.status);
        return { status: "processing" };
      }

      const result = await res.json();
      const state = result.status || result.state;

      if (state === "completed" || state === "succeeded") {
        const outputs = result.outputs || [];
        const avatarImage = outputs[0] || (typeof result.output === "string" ? result.output : result.output?.image || result.output?.urls?.get);

        if (!avatarImage) {
          throw new Error("Empty image output from avatar generation model");
        }

        const updated = await this.completeCharacterCreation(creation, avatarImage);
        return { status: "completed", creation: updated };
      } else if (state === "failed") {
        const errorMsg = result.error || "Avatar image generation failed";
        const updated = await this.failCharacterCreation(creation, errorMsg);
        return { status: "failed", error: errorMsg };
      }
    } catch (e) {
      console.error("Polling error in checkStatus:", e);
    }

    return { status: "processing" };
  }
};
