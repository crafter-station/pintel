export interface ModelPricing {
  input: number; // Cost per 1M input tokens
  output: number; // Cost per 1M output tokens
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  color: string;
  pricing: ModelPricing;
  tier: "budget" | "mid" | "premium" | "flagship";
}

// All AI Gateway Chat Models (Dec 2024)
export const AVAILABLE_MODELS: ModelConfig[] = [
  // === OpenAI ===
  { id: "openai/gpt-5", name: "GPT-5", provider: "OpenAI", color: "#10a37f", pricing: { input: 1.25, output: 10 }, tier: "flagship" },
  { id: "openai/gpt-5-pro", name: "GPT-5 Pro", provider: "OpenAI", color: "#10a37f", pricing: { input: 15, output: 120 }, tier: "flagship" },
  { id: "openai/gpt-5-mini", name: "GPT-5 Mini", provider: "OpenAI", color: "#10a37f", pricing: { input: 0.25, output: 2 }, tier: "budget" },
  { id: "openai/gpt-5-nano", name: "GPT-5 Nano", provider: "OpenAI", color: "#10a37f", pricing: { input: 0.05, output: 0.4 }, tier: "budget" },
  { id: "openai/gpt-5-chat", name: "GPT-5 Chat", provider: "OpenAI", color: "#10a37f", pricing: { input: 1.25, output: 10 }, tier: "premium" },
  { id: "openai/gpt-5-codex", name: "GPT-5 Codex", provider: "OpenAI", color: "#10a37f", pricing: { input: 1.25, output: 10 }, tier: "premium" },
  { id: "openai/gpt-5.1-instant", name: "GPT-5.1 Instant", provider: "OpenAI", color: "#10a37f", pricing: { input: 1.25, output: 10 }, tier: "premium" },
  { id: "openai/gpt-5.1-thinking", name: "GPT-5.1 Thinking", provider: "OpenAI", color: "#10a37f", pricing: { input: 1.25, output: 10 }, tier: "premium" },
  { id: "openai/gpt-5.1-codex", name: "GPT-5.1 Codex", provider: "OpenAI", color: "#10a37f", pricing: { input: 1.25, output: 10 }, tier: "premium" },
  { id: "openai/gpt-5.1-codex-mini", name: "GPT-5.1 Codex Mini", provider: "OpenAI", color: "#10a37f", pricing: { input: 0.25, output: 2 }, tier: "mid" },
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI", color: "#10a37f", pricing: { input: 2.5, output: 10 }, tier: "premium" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", color: "#10a37f", pricing: { input: 0.15, output: 0.6 }, tier: "budget" },
  { id: "openai/gpt-4.1", name: "GPT-4.1", provider: "OpenAI", color: "#10a37f", pricing: { input: 2, output: 8 }, tier: "premium" },
  { id: "openai/gpt-4.1-mini", name: "GPT-4.1 Mini", provider: "OpenAI", color: "#10a37f", pricing: { input: 0.4, output: 1.6 }, tier: "budget" },
  { id: "openai/gpt-4.1-nano", name: "GPT-4.1 Nano", provider: "OpenAI", color: "#10a37f", pricing: { input: 0.1, output: 0.4 }, tier: "budget" },
  { id: "openai/gpt-4-turbo", name: "GPT-4 Turbo", provider: "OpenAI", color: "#10a37f", pricing: { input: 10, output: 30 }, tier: "premium" },
  { id: "openai/gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "OpenAI", color: "#10a37f", pricing: { input: 0.5, output: 1.5 }, tier: "budget" },
  { id: "openai/gpt-oss-120b", name: "GPT OSS 120B", provider: "OpenAI", color: "#10a37f", pricing: { input: 0.1, output: 0.5 }, tier: "mid" },
  { id: "openai/gpt-oss-20b", name: "GPT OSS 20B", provider: "OpenAI", color: "#10a37f", pricing: { input: 0.07, output: 0.3 }, tier: "budget" },
  { id: "openai/gpt-oss-safeguard-20b", name: "GPT OSS Safeguard 20B", provider: "OpenAI", color: "#10a37f", pricing: { input: 0.07, output: 0.3 }, tier: "budget" },
  { id: "openai/o1", name: "o1", provider: "OpenAI", color: "#10a37f", pricing: { input: 15, output: 60 }, tier: "flagship" },
  { id: "openai/o3", name: "o3", provider: "OpenAI", color: "#10a37f", pricing: { input: 2, output: 8 }, tier: "premium" },
  { id: "openai/o3-mini", name: "o3 Mini", provider: "OpenAI", color: "#10a37f", pricing: { input: 1.1, output: 4.4 }, tier: "mid" },
  { id: "openai/o3-deep-research", name: "o3 Deep Research", provider: "OpenAI", color: "#10a37f", pricing: { input: 10, output: 40 }, tier: "flagship" },
  { id: "openai/o4-mini", name: "o4 Mini", provider: "OpenAI", color: "#10a37f", pricing: { input: 1.1, output: 4.4 }, tier: "mid" },

  // === Anthropic ===
  { id: "anthropic/claude-opus-4.5", name: "Claude Opus 4.5", provider: "Anthropic", color: "#d97706", pricing: { input: 5, output: 25 }, tier: "flagship" },
  { id: "anthropic/claude-opus-4.1", name: "Claude Opus 4.1", provider: "Anthropic", color: "#d97706", pricing: { input: 15, output: 75 }, tier: "flagship" },
  { id: "anthropic/claude-opus-4", name: "Claude Opus 4", provider: "Anthropic", color: "#d97706", pricing: { input: 15, output: 75 }, tier: "flagship" },
  { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5", provider: "Anthropic", color: "#d97706", pricing: { input: 3, output: 15 }, tier: "premium" },
  { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", provider: "Anthropic", color: "#d97706", pricing: { input: 3, output: 15 }, tier: "premium" },
  { id: "anthropic/claude-3.7-sonnet", name: "Claude 3.7 Sonnet", provider: "Anthropic", color: "#d97706", pricing: { input: 3, output: 15 }, tier: "premium" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic", color: "#d97706", pricing: { input: 3, output: 15 }, tier: "premium" },
  { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5", provider: "Anthropic", color: "#d97706", pricing: { input: 1, output: 5 }, tier: "mid" },
  { id: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku", provider: "Anthropic", color: "#d97706", pricing: { input: 0.8, output: 4 }, tier: "budget" },
  { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku", provider: "Anthropic", color: "#d97706", pricing: { input: 0.25, output: 1.25 }, tier: "budget" },
  { id: "anthropic/claude-3-opus", name: "Claude 3 Opus", provider: "Anthropic", color: "#d97706", pricing: { input: 15, output: 75 }, tier: "flagship" },

  // === Google ===
  { id: "google/gemini-3-pro-preview", name: "Gemini 3 Pro Preview", provider: "Google", color: "#4285f4", pricing: { input: 2, output: 12 }, tier: "premium" },
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "Google", color: "#4285f4", pricing: { input: 1.25, output: 10 }, tier: "premium" },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google", color: "#4285f4", pricing: { input: 0.3, output: 2.5 }, tier: "mid" },
  { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", provider: "Google", color: "#4285f4", pricing: { input: 0.1, output: 0.4 }, tier: "budget" },
  { id: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "Google", color: "#4285f4", pricing: { input: 0.1, output: 0.4 }, tier: "budget" },
  { id: "google/gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite", provider: "Google", color: "#4285f4", pricing: { input: 0.07, output: 0.3 }, tier: "budget" },

  // === xAI ===
  { id: "xai/grok-4", name: "Grok 4", provider: "xAI", color: "#1d9bf0", pricing: { input: 3, output: 15 }, tier: "premium" },
  { id: "xai/grok-4-fast-reasoning", name: "Grok 4 Fast Reasoning", provider: "xAI", color: "#1d9bf0", pricing: { input: 0.2, output: 0.5 }, tier: "budget" },
  { id: "xai/grok-4-fast-non-reasoning", name: "Grok 4 Fast Non-Reasoning", provider: "xAI", color: "#1d9bf0", pricing: { input: 0.2, output: 0.5 }, tier: "budget" },
  { id: "xai/grok-4.1-fast-reasoning", name: "Grok 4.1 Fast Reasoning", provider: "xAI", color: "#1d9bf0", pricing: { input: 0.2, output: 0.5 }, tier: "budget" },
  { id: "xai/grok-4.1-fast-non-reasoning", name: "Grok 4.1 Fast Non-Reasoning", provider: "xAI", color: "#1d9bf0", pricing: { input: 0.2, output: 0.5 }, tier: "budget" },
  { id: "xai/grok-3", name: "Grok 3", provider: "xAI", color: "#1d9bf0", pricing: { input: 3, output: 15 }, tier: "premium" },
  { id: "xai/grok-3-fast", name: "Grok 3 Fast", provider: "xAI", color: "#1d9bf0", pricing: { input: 5, output: 25 }, tier: "premium" },
  { id: "xai/grok-3-mini", name: "Grok 3 Mini", provider: "xAI", color: "#1d9bf0", pricing: { input: 0.3, output: 0.5 }, tier: "budget" },
  { id: "xai/grok-3-mini-fast", name: "Grok 3 Mini Fast", provider: "xAI", color: "#1d9bf0", pricing: { input: 0.6, output: 4 }, tier: "mid" },
  { id: "xai/grok-2", name: "Grok 2", provider: "xAI", color: "#1d9bf0", pricing: { input: 2, output: 10 }, tier: "mid" },
  { id: "xai/grok-2-vision", name: "Grok 2 Vision", provider: "xAI", color: "#1d9bf0", pricing: { input: 2, output: 10 }, tier: "mid" },
  { id: "xai/grok-code-fast-1", name: "Grok Code Fast 1", provider: "xAI", color: "#1d9bf0", pricing: { input: 0.2, output: 1.5 }, tier: "mid" },

  // === DeepSeek ===
  { id: "deepseek/deepseek-v3.2", name: "DeepSeek V3.2", provider: "DeepSeek", color: "#5865f2", pricing: { input: 0.28, output: 0.42 }, tier: "budget" },
  { id: "deepseek/deepseek-v3.2-thinking", name: "DeepSeek V3.2 Thinking", provider: "DeepSeek", color: "#5865f2", pricing: { input: 0.28, output: 0.42 }, tier: "budget" },
  { id: "deepseek/deepseek-v3.2-exp", name: "DeepSeek V3.2 Exp", provider: "DeepSeek", color: "#5865f2", pricing: { input: 0.27, output: 0.4 }, tier: "budget" },
  { id: "deepseek/deepseek-v3.2-speciale", name: "DeepSeek V3.2 Speciale", provider: "DeepSeek", color: "#5865f2", pricing: { input: 0.28, output: 0.42 }, tier: "budget" },
  { id: "deepseek/deepseek-v3.1", name: "DeepSeek V3.1", provider: "DeepSeek", color: "#5865f2", pricing: { input: 0.3, output: 1 }, tier: "budget" },
  { id: "deepseek/deepseek-v3.1-terminus", name: "DeepSeek V3.1 Terminus", provider: "DeepSeek", color: "#5865f2", pricing: { input: 0.27, output: 1 }, tier: "budget" },
  { id: "deepseek/deepseek-v3", name: "DeepSeek V3", provider: "DeepSeek", color: "#5865f2", pricing: { input: 0.77, output: 0.77 }, tier: "budget" },
  { id: "deepseek/deepseek-r1", name: "DeepSeek R1", provider: "DeepSeek", color: "#5865f2", pricing: { input: 0.5, output: 2.15 }, tier: "mid" },

  // === Meta ===
  { id: "meta/llama-4-maverick", name: "Llama 4 Maverick", provider: "Meta", color: "#0668e1", pricing: { input: 0.15, output: 0.6 }, tier: "mid" },
  { id: "meta/llama-4-scout", name: "Llama 4 Scout", provider: "Meta", color: "#0668e1", pricing: { input: 0.08, output: 0.3 }, tier: "budget" },
  { id: "meta/llama-3.3-70b", name: "Llama 3.3 70B", provider: "Meta", color: "#0668e1", pricing: { input: 0.72, output: 0.72 }, tier: "mid" },
  { id: "meta/llama-3.2-90b", name: "Llama 3.2 90B", provider: "Meta", color: "#0668e1", pricing: { input: 0.72, output: 0.72 }, tier: "mid" },
  { id: "meta/llama-3.2-11b", name: "Llama 3.2 11B", provider: "Meta", color: "#0668e1", pricing: { input: 0.16, output: 0.16 }, tier: "budget" },
  { id: "meta/llama-3.2-3b", name: "Llama 3.2 3B", provider: "Meta", color: "#0668e1", pricing: { input: 0.15, output: 0.15 }, tier: "budget" },
  { id: "meta/llama-3.2-1b", name: "Llama 3.2 1B", provider: "Meta", color: "#0668e1", pricing: { input: 0.1, output: 0.1 }, tier: "budget" },
  { id: "meta/llama-3.1-70b", name: "Llama 3.1 70B", provider: "Meta", color: "#0668e1", pricing: { input: 0.72, output: 0.72 }, tier: "mid" },
  { id: "meta/llama-3.1-8b", name: "Llama 3.1 8B", provider: "Meta", color: "#0668e1", pricing: { input: 0.05, output: 0.08 }, tier: "budget" },

  // === Mistral ===
  { id: "mistral/mistral-large", name: "Mistral Large", provider: "Mistral", color: "#ff7000", pricing: { input: 2, output: 6 }, tier: "premium" },
  { id: "mistral/mistral-large-3", name: "Mistral Large 3", provider: "Mistral", color: "#ff7000", pricing: { input: 0.5, output: 1.5 }, tier: "mid" },
  { id: "mistral/mistral-medium", name: "Mistral Medium", provider: "Mistral", color: "#ff7000", pricing: { input: 0.4, output: 2 }, tier: "mid" },
  { id: "mistral/mistral-small", name: "Mistral Small", provider: "Mistral", color: "#ff7000", pricing: { input: 0.1, output: 0.3 }, tier: "budget" },
  { id: "mistral/magistral-medium", name: "Magistral Medium", provider: "Mistral", color: "#ff7000", pricing: { input: 2, output: 5 }, tier: "premium" },
  { id: "mistral/magistral-small", name: "Magistral Small", provider: "Mistral", color: "#ff7000", pricing: { input: 0.5, output: 1.5 }, tier: "mid" },
  { id: "mistral/ministral-8b", name: "Ministral 8B", provider: "Mistral", color: "#ff7000", pricing: { input: 0.1, output: 0.1 }, tier: "budget" },
  { id: "mistral/ministral-3b", name: "Ministral 3B", provider: "Mistral", color: "#ff7000", pricing: { input: 0.04, output: 0.04 }, tier: "budget" },
  { id: "mistral/codestral", name: "Codestral", provider: "Mistral", color: "#ff7000", pricing: { input: 0.3, output: 0.9 }, tier: "mid" },
  { id: "mistral/devstral-small", name: "Devstral Small", provider: "Mistral", color: "#ff7000", pricing: { input: 0.1, output: 0.3 }, tier: "budget" },
  { id: "mistral/pixtral-large", name: "Pixtral Large", provider: "Mistral", color: "#ff7000", pricing: { input: 2, output: 6 }, tier: "premium" },
  { id: "mistral/pixtral-12b", name: "Pixtral 12B", provider: "Mistral", color: "#ff7000", pricing: { input: 0.15, output: 0.15 }, tier: "budget" },
  { id: "mistral/mixtral-8x22b-instruct", name: "Mixtral 8x22B", provider: "Mistral", color: "#ff7000", pricing: { input: 1.2, output: 1.2 }, tier: "mid" },

  // === Alibaba ===
  { id: "alibaba/qwen3-max", name: "Qwen3 Max", provider: "Alibaba", color: "#ff6a00", pricing: { input: 1.2, output: 6 }, tier: "premium" },
  { id: "alibaba/qwen3-max-preview", name: "Qwen3 Max Preview", provider: "Alibaba", color: "#ff6a00", pricing: { input: 1.2, output: 6 }, tier: "premium" },
  { id: "alibaba/qwen3-coder", name: "Qwen3 Coder", provider: "Alibaba", color: "#ff6a00", pricing: { input: 0.38, output: 1.53 }, tier: "mid" },
  { id: "alibaba/qwen3-coder-plus", name: "Qwen3 Coder Plus", provider: "Alibaba", color: "#ff6a00", pricing: { input: 1, output: 5 }, tier: "premium" },
  { id: "alibaba/qwen3-coder-30b-a3b", name: "Qwen3 Coder 30B", provider: "Alibaba", color: "#ff6a00", pricing: { input: 0.07, output: 0.27 }, tier: "budget" },
  { id: "alibaba/qwen3-235b-a22b-thinking", name: "Qwen3 235B Thinking", provider: "Alibaba", color: "#ff6a00", pricing: { input: 0.3, output: 2.9 }, tier: "mid" },
  { id: "alibaba/qwen3-next-80b-a3b-instruct", name: "Qwen3 Next 80B Instruct", provider: "Alibaba", color: "#ff6a00", pricing: { input: 0.15, output: 1.5 }, tier: "mid" },
  { id: "alibaba/qwen3-next-80b-a3b-thinking", name: "Qwen3 Next 80B Thinking", provider: "Alibaba", color: "#ff6a00", pricing: { input: 0.15, output: 1.5 }, tier: "mid" },
  { id: "alibaba/qwen3-vl-thinking", name: "Qwen3 VL Thinking", provider: "Alibaba", color: "#ff6a00", pricing: { input: 0.7, output: 8.4 }, tier: "premium" },
  { id: "alibaba/qwen3-vl-instruct", name: "Qwen3 VL Instruct", provider: "Alibaba", color: "#ff6a00", pricing: { input: 0.7, output: 2.8 }, tier: "mid" },
  { id: "alibaba/qwen-3-235b", name: "Qwen 3 235B", provider: "Alibaba", color: "#ff6a00", pricing: { input: 0.13, output: 0.6 }, tier: "mid" },
  { id: "alibaba/qwen-3-32b", name: "Qwen 3 32B", provider: "Alibaba", color: "#ff6a00", pricing: { input: 0.1, output: 0.3 }, tier: "budget" },
  { id: "alibaba/qwen-3-30b", name: "Qwen 3 30B", provider: "Alibaba", color: "#ff6a00", pricing: { input: 0.08, output: 0.29 }, tier: "budget" },
  { id: "alibaba/qwen-3-14b", name: "Qwen 3 14B", provider: "Alibaba", color: "#ff6a00", pricing: { input: 0.06, output: 0.24 }, tier: "budget" },

  // === Amazon ===
  { id: "amazon/nova-pro", name: "Nova Pro", provider: "Amazon", color: "#ff9900", pricing: { input: 0.8, output: 3.2 }, tier: "mid" },
  { id: "amazon/nova-lite", name: "Nova Lite", provider: "Amazon", color: "#ff9900", pricing: { input: 0.06, output: 0.24 }, tier: "budget" },
  { id: "amazon/nova-micro", name: "Nova Micro", provider: "Amazon", color: "#ff9900", pricing: { input: 0.04, output: 0.14 }, tier: "budget" },

  // === Cohere ===
  { id: "cohere/command-a", name: "Command A", provider: "Cohere", color: "#d18ee2", pricing: { input: 2.5, output: 10 }, tier: "premium" },

  // === Moonshot ===
  { id: "moonshotai/kimi-k2-turbo", name: "Kimi K2 Turbo", provider: "Moonshot", color: "#6366f1", pricing: { input: 2.4, output: 10 }, tier: "premium" },
  { id: "moonshotai/kimi-k2-thinking-turbo", name: "Kimi K2 Thinking Turbo", provider: "Moonshot", color: "#6366f1", pricing: { input: 1.15, output: 8 }, tier: "premium" },
  { id: "moonshotai/kimi-k2-thinking", name: "Kimi K2 Thinking", provider: "Moonshot", color: "#6366f1", pricing: { input: 0.6, output: 2.5 }, tier: "mid" },
  { id: "moonshotai/kimi-k2", name: "Kimi K2", provider: "Moonshot", color: "#6366f1", pricing: { input: 0.5, output: 2 }, tier: "mid" },
  { id: "moonshotai/kimi-k2-0905", name: "Kimi K2 0905", provider: "Moonshot", color: "#6366f1", pricing: { input: 0.6, output: 2.5 }, tier: "mid" },

  // === Perplexity ===
  { id: "perplexity/sonar-pro", name: "Sonar Pro", provider: "Perplexity", color: "#20b2aa", pricing: { input: 3, output: 15 }, tier: "premium" },
  { id: "perplexity/sonar", name: "Sonar", provider: "Perplexity", color: "#20b2aa", pricing: { input: 1, output: 1 }, tier: "mid" },
  { id: "perplexity/sonar-reasoning-pro", name: "Sonar Reasoning Pro", provider: "Perplexity", color: "#20b2aa", pricing: { input: 2, output: 8 }, tier: "premium" },
  { id: "perplexity/sonar-reasoning", name: "Sonar Reasoning", provider: "Perplexity", color: "#20b2aa", pricing: { input: 1, output: 5 }, tier: "mid" },

  // === ZAI (GLM) ===
  { id: "zai/glm-4.6", name: "GLM 4.6", provider: "ZAI", color: "#00d4aa", pricing: { input: 0.45, output: 1.8 }, tier: "mid" },
  { id: "zai/glm-4.5", name: "GLM 4.5", provider: "ZAI", color: "#00d4aa", pricing: { input: 0.6, output: 2.2 }, tier: "mid" },
  { id: "zai/glm-4.5-air", name: "GLM 4.5 Air", provider: "ZAI", color: "#00d4aa", pricing: { input: 0.2, output: 1.1 }, tier: "budget" },
  { id: "zai/glm-4.5v", name: "GLM 4.5V", provider: "ZAI", color: "#00d4aa", pricing: { input: 0.6, output: 1.8 }, tier: "mid" },

  // === Minimax ===
  { id: "minimax/minimax-m2", name: "Minimax M2", provider: "Minimax", color: "#ff4500", pricing: { input: 0.27, output: 1.15 }, tier: "mid" },

  // === Meituan ===
  { id: "meituan/longcat-flash-chat", name: "Longcat Flash Chat", provider: "Meituan", color: "#ffd700", pricing: { input: 0.1, output: 0.5 }, tier: "budget" },
  { id: "meituan/longcat-flash-thinking", name: "Longcat Flash Thinking", provider: "Meituan", color: "#ffd700", pricing: { input: 0.15, output: 1.5 }, tier: "mid" },

  // === Vercel ===
  { id: "vercel/v0-1.5-md", name: "v0 1.5", provider: "Vercel", color: "#000000", pricing: { input: 3, output: 15 }, tier: "premium" },
  { id: "vercel/v0-1.0-md", name: "v0 1.0", provider: "Vercel", color: "#000000", pricing: { input: 3, output: 15 }, tier: "premium" },

  // === Stealth ===
  { id: "stealth/sonoma-sky-alpha", name: "Sonoma Sky Alpha", provider: "Stealth", color: "#87ceeb", pricing: { input: 0.2, output: 0.5 }, tier: "budget" },
  { id: "stealth/sonoma-dusk-alpha", name: "Sonoma Dusk Alpha", provider: "Stealth", color: "#87ceeb", pricing: { input: 0.2, output: 0.5 }, tier: "budget" },

  // === Morph ===
  { id: "morph/morph-v3-fast", name: "Morph V3 Fast", provider: "Morph", color: "#9370db", pricing: { input: 0.8, output: 1.2 }, tier: "mid" },
  { id: "morph/morph-v3-large", name: "Morph V3 Large", provider: "Morph", color: "#9370db", pricing: { input: 0.9, output: 1.9 }, tier: "mid" },

  // === Arcee ===
  { id: "arcee-ai/trinity-mini", name: "Trinity Mini", provider: "Arcee", color: "#ff69b4", pricing: { input: 0.04, output: 0.15 }, tier: "budget" },

  // === Prime Intellect ===
  { id: "prime-intellect/intellect-3", name: "Intellect 3", provider: "Prime Intellect", color: "#8a2be2", pricing: { input: 0.2, output: 1.1 }, tier: "mid" },

  // === Inception ===
  { id: "inception/mercury-coder-small", name: "Mercury Coder Small", provider: "Inception", color: "#00ced1", pricing: { input: 0.25, output: 1 }, tier: "mid" },
];

export function getModelById(id: string): ModelConfig | undefined {
  return AVAILABLE_MODELS.find((m) => m.id === id);
}

export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const model = getModelById(modelId);
  if (!model) return 0;

  const inputCost = (inputTokens / 1_000_000) * model.pricing.input;
  const outputCost = (outputTokens / 1_000_000) * model.pricing.output;

  return inputCost + outputCost;
}

export function formatCost(cost: number): string {
  if (cost < 0.0001) return "<$0.0001";
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(3)}`;
}

export function getModelsByTier(tier: ModelConfig["tier"]): ModelConfig[] {
  return AVAILABLE_MODELS.filter((m) => m.tier === tier);
}

export function getModelsByProvider(provider: string): ModelConfig[] {
  return AVAILABLE_MODELS.filter((m) => m.provider === provider);
}

export function getUniqueProviders(): string[] {
  return [...new Set(AVAILABLE_MODELS.map((m) => m.provider))];
}

export function shuffleModels(models: ModelConfig[], count: number): ModelConfig[] {
  const shuffled = [...models].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export const DEFAULT_MODELS = [
  "openai/gpt-4o",
  "anthropic/claude-sonnet-4",
  "google/gemini-2.5-flash",
  "xai/grok-3-mini",
];

// Vision-capable models for Model Guess mode
export const VISION_MODELS = [
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "openai/gpt-4.1",
  "openai/gpt-4.1-mini",
  "anthropic/claude-sonnet-4.5",
  "anthropic/claude-sonnet-4",
  "anthropic/claude-3.7-sonnet",
  "anthropic/claude-3.5-sonnet",
  "anthropic/claude-haiku-4.5",
  "anthropic/claude-3.5-haiku",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "google/gemini-2.0-flash",
  "xai/grok-2-vision",
  "meta/llama-3.2-90b",
  "meta/llama-3.2-11b",
];

export const DEFAULT_VISION_MODELS = [
  "openai/gpt-4o-mini",
  "anthropic/claude-3.5-haiku",
  "google/gemini-2.0-flash",
  "xai/grok-2-vision",
];

export function getVisionModels(): ModelConfig[] {
  return VISION_MODELS.map(id => getModelById(id)).filter(Boolean) as ModelConfig[];
}

// Models that don't support structured output (tool use) at all
// These models cannot be used for drawing generation
export const NO_STRUCTURED_OUTPUT_MODELS = [
  "meta/llama-3.2-1b",
  "meta/llama-3.2-3b",
  "meta/llama-3.2-11b",
  "meta/llama-3.1-8b",
];

export function supportsStructuredOutput(modelId: string): boolean {
  return !NO_STRUCTURED_OUTPUT_MODELS.includes(modelId);
}

// Get models that can be used for drawing generation
export function getDrawingCapableModels(): ModelConfig[] {
  return AVAILABLE_MODELS.filter(m => supportsStructuredOutput(m.id));
}
