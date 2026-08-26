// ========================================
// SMART ROUTER — Dynamic Model Selection
// ========================================

const MODELS = {
  free: [
    // OpenRouter (Free)
    { id: 'google/gemma-4-26b-a4b-it:free', name: 'Gemma 4 26B', provider: 'openrouter', keyEnv: 'OPENROUTER_API_KEY' },
    { id: 'minimax/minimax-m3:free', name: 'MiniMax M3', provider: 'openrouter', keyEnv: 'OPENROUTER_API_KEY' },
    { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', name: 'Nemotron 3 Ultra 550B', provider: 'openrouter', keyEnv: 'OPENROUTER_API_KEY' },
    { id: 'z-ai/glm-5.2:free', name: 'GLM 5.2', provider: 'openrouter', keyEnv: 'OPENROUTER_API_KEY' },
    { id: 'poolside/laguna-s-2.1:free', name: 'Laguna S 2.1', provider: 'openrouter', keyEnv: 'OPENROUTER_API_KEY' },
    { id: 'nvidia/nemotron-3.5-lightning:free', name: 'Nemotron 3.5 Lightning', provider: 'openrouter', keyEnv: 'OPENROUTER_API_KEY' },
    { id: 'liquid/lfm-2.5-2.6b:free', name: 'LFM 2.5 2.6B', provider: 'openrouter', keyEnv: 'OPENROUTER_API_KEY' },
    // Groq (Free tier)
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Groq)', provider: 'groq', keyEnv: 'GROQ_API_KEY' },
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq)', provider: 'groq', keyEnv: 'GROQ_API_KEY' },
    { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B (Groq)', provider: 'groq', keyEnv: 'GROQ_API_KEY' },
    { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B (Groq)', provider: 'groq', keyEnv: 'GROQ_API_KEY' },
    { id: 'qwen/qwen3.6-27b', name: 'Qwen 3.6 27B (Groq)', provider: 'groq', keyEnv: 'GROQ_API_KEY' },
    // Nvidia NIM (Free credits)
    { id: 'meta/llama-4-maverick', name: 'Llama 4 Maverick (Nvidia)', provider: 'nvidia', keyEnv: 'NVIDIA_API_KEY' },
    { id: 'nvidia/nemotron-3-nano-omni', name: 'Nemotron 3 Nano Omni (Nvidia)', provider: 'nvidia', keyEnv: 'NVIDIA_API_KEY' },
    { id: 'mistralai/mistral-large-3-675b', name: 'Mistral Large 3 675B (Nvidia)', provider: 'nvidia', keyEnv: 'NVIDIA_API_KEY' },
    { id: 'google/gemma-4-31b-it', name: 'Gemma 4 31B (Nvidia)', provider: 'nvidia', keyEnv: 'NVIDIA_API_KEY' },
    { id: 'minimaxai/minimax-m2.7', name: 'MiniMax M2.7 (Nvidia)', provider: 'nvidia', keyEnv: 'NVIDIA_API_KEY' },
    { id: 'stepfun/step-3.5-flash', name: 'Step 3.5 Flash (Nvidia)', provider: 'nvidia', keyEnv: 'NVIDIA_API_KEY' },
  ],

  standard: [
    { id: 'deepseek/deepseek-v4-flash-0731', name: 'DeepSeek V4 Flash 0731', provider: 'openrouter', keyEnv: 'OPENROUTER_API_KEY' },
    { id: 'qwen/qwen3.7-flash', name: 'Qwen 3.7 Flash', provider: 'openrouter', keyEnv: 'OPENROUTER_API_KEY' },
    { id: 'inclusionai/ling-3.0-flash', name: 'Ling 3.0 Flash', provider: 'openrouter', keyEnv: 'OPENROUTER_API_KEY' },
    { id: 'poolside/laguna-xs-2.1', name: 'Laguna XS 2.1', provider: 'openrouter', keyEnv: 'OPENROUTER_API_KEY' },
    { id: 'ibm-granite/granite-4.1-8b', name: 'Granite 4.1 8B', provider: 'openrouter', keyEnv: 'OPENROUTER_API_KEY' },
    { id: 'deepseek/deepseek-v4-flash', name: 'DeepSeek V4 Flash', provider: 'openrouter', keyEnv: 'OPENROUTER_API_KEY' },
    { id: 'google/gemma-4-26b-a4b-it', name: 'Gemma 4 26B', provider: 'openrouter', keyEnv: 'OPENROUTER_API_KEY' },
    { id: 'stepfun/step-3.5-flash', name: 'Step 3.5 Flash', provider: 'openrouter', keyEnv: 'OPENROUTER_API_KEY' },
    { id: 'bytedance-seed/seed-1.6-flash', name: 'Seed 1.6 Flash', provider: 'openrouter', keyEnv: 'OPENROUTER_API_KEY' },
    { id: 'mistralai/ministral-14b-2512', name: 'Ministral 14B', provider: 'openrouter', keyEnv: 'OPENROUTER_API_KEY' },
    { id: 'openai/gpt-oss-safeguard-20b', name: 'GPT OSS Safeguard 20B', provider: 'openrouter', keyEnv: 'OPENROUTER_API_KEY' },
    { id: 'meta-llama/llama-4-scout', name: 'Llama 4 Scout', provider: 'openrouter', keyEnv: 'OPENROUTER_API_KEY' },
    { id: 'microsoft/phi-4', name: 'Phi 4', provider: 'openrouter', keyEnv: 'OPENROUTER_API_KEY' },
    { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', provider: 'openrouter', keyEnv: 'OPENROUTER_API_KEY' },
    { id: 'cohere/command-r7b-12-2024', name: 'Command R7B', provider: 'openrouter', keyEnv: 'OPENROUTER_API_KEY' },
    { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', provider: 'openrouter', keyEnv: 'OPENROUTER_API_KEY' },
    { id: 'meta-llama/llama-guard-4-12b', name: 'Llama Guard 4 12B', provider: 'openrouter', keyEnv: 'OPENROUTER_API_KEY' },
  ],

  elite: [
    { id: 'deepseek-chat', name: 'DeepSeek V4 Pro', provider: 'deepseek', keyEnv: 'DEEPSEEK_API_KEY' },
    { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', provider: 'deepseek', keyEnv: 'DEEPSEEK_API_KEY' },
  ],
};

const BASE_URLS = {
  openrouter: 'https://openrouter.ai/api/v1',
  groq: 'https://api.groq.com/openai/v1',
  nvidia: 'https://integrate.api.nvidia.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
};

const BLACKLIST_DURATION = 5 * 60 * 1000; // 5 minutes

class SmartRouter {
  constructor() {
    this._bl = new Map(); // modelId → expiry timestamp
    this.stats = new Map();    // modelId → { success: 0, fail: 0, lastUsed: 0 }
  }

  getModels(mode) {
    return MODELS[mode] || MODELS.free;
  }

  isBlacklisted(modelId) {
    const expiry = this._bl.get(modelId);
    if (!expiry) return false;
    if (Date.now() > expiry) {
      this._bl.delete(modelId);
      return false;
    }
    return true;
  }

  blacklist(modelId) {
    this._bl.set(modelId, Date.now() + BLACKLIST_DURATION);
  }

  getStats(modelId) {
    if (!this.stats.has(modelId)) {
      this.stats.set(modelId, { success: 0, fail: 0, lastUsed: 0 });
    }
    return this.stats.get(modelId);
  }

  recordSuccess(modelId) {
    const s = this.getStats(modelId);
    s.success++;
    s.lastUsed = Date.now();
  }

  recordFail(modelId) {
    const s = this.getStats(modelId);
    s.fail++;
    s.lastUsed = Date.now();
  }

  getWeight(modelId) {
    const s = this.getStats(modelId);
    // Base weight 10, +2 per success, -3 per fail
    const weight = Math.max(1, 10 + (s.success * 2) - (s.fail * 3));
    // Reduce weight if recently used (avoid same model repeatedly)
    const timeSinceUse = Date.now() - s.lastUsed;
    if (timeSinceUse < 10000) return weight * 0.3; // Used < 10s ago
    if (timeSinceUse < 30000) return weight * 0.6; // Used < 30s ago
    return weight;
  }

  weightedPick(models) {
    const totalWeight = models.reduce((sum, m) => sum + m.weight, 0);
    let random = Math.random() * totalWeight;
    for (const m of models) {
      random -= m.weight;
      if (random <= 0) return m;
    }
    return models[models.length - 1];
  }

  resolve(mode, forceModel = null) {
    const allModels = this.getModels(mode);

    // If user forced a specific model
    if (forceModel) {
      const found = allModels.find(m => m.id === forceModel);
      if (found && !this.isBlacklisted(found.id)) {
        return { ...found, baseURL: BASE_URLS[found.provider] };
      }
    }

    // Filter available models
    const available = allModels.filter(m => {
      if (this.isBlacklisted(m.id)) return false;
      if (!process.env[m.keyEnv]) return false; // No API key
      return true;
    });

    if (available.length === 0) {
      // Reset blacklist and try again
      this._bl.clear();
      const retry = allModels.filter(m => process.env[m.keyEnv]);
      if (retry.length === 0) return null;
      return this.weightedPick(retry.map(m => ({ ...m, weight: this.getWeight(m.id) })));
    }

    const weighted = available.map(m => ({ ...m, weight: this.getWeight(m.id) }));
    const picked = this.weightedPick(weighted);
    return { ...picked, baseURL: BASE_URLS[picked.provider] };
  }

  async failover(mode, fn, forceModel = null) {
    const maxAttempts = 3;
    const tried = new Set();

    for (let i = 0; i < maxAttempts; i++) {
      let model = this.resolve(mode, forceModel && i === 0 ? forceModel : null);

      if (!model) throw new Error('Aucun modèle disponible pour ce mode');

      // Avoid retrying the same model
      if (tried.has(model.id) && tried.size < this.getModels(mode).length) {
        i--;
        this.blacklist(model.id);
        continue;
      }
      tried.add(model.id);

      try {
        const result = await fn(model);
        this.recordSuccess(model.id);
        return { ...result, _model: model.id, _modelName: model.name, _provider: model.provider };
      } catch (err) {
        this.recordFail(model.id);
        this.blacklist(model.id);
        if (i === maxAttempts - 1) throw err;
      }
    }
  }

  getAvailableCount(mode) {
    return this.getModels(mode).filter(m => process.env[m.keyEnv] && !this.isBlacklisted(m.id)).length;
  }

  getStatus() {
    const status = {};
    for (const [mode, models] of Object.entries(MODELS)) {
      status[mode] = {
        total: models.length,
        available: models.filter(m => process.env[m.keyEnv]).length,
        blacklisted: models.filter(m => this.isBlacklisted(m.id)).length,
      };
    }
    return status;
  }
}

// Singleton
const router = new SmartRouter();

module.exports = { router, MODELS, BASE_URLS };
