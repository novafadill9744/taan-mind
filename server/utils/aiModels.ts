/**
 * @file AI model resolution and availability validation.
 *
 * Maps model identifiers (e.g., `minimax/MiniMax-M2.7`) to AI SDK language model
 * instances by selecting the appropriate provider client with credentials from
 * runtime config. Also validates that Ollama models exist at runtime since they
 * can be added or removed while the application is running.
 */
import type { H3Event } from 'h3'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createMinimax } from 'vercel-minimax-ai-provider'
import type { ModelProvider } from '#shared/utils/models'
import { isSelectableModel, isStaticModel, isSupportedModel } from '#shared/utils/models'
import {
  getOllamaOpenAIBaseUrlFromConfig,
  hasOllamaModel,
  type OllamaRuntimeConfig
} from './ollama'

/** Supported AI model provider names. */
type ProviderName = ModelProvider

const SUPPORTED_PROVIDERS: ProviderName[] = ['minimax', 'glm', 'ollama']

/** Runtime config subset required to resolve supported language models. */
export interface LanguageModelRuntimeConfig extends OllamaRuntimeConfig {
  /** MiniMax API key. */
  minimaxApiKey?: unknown
  /** Optional custom MiniMax base URL. */
  minimaxBaseUrl?: unknown
  /** GLM API key. */
  glmApiKey?: unknown
  /** GLM OpenAI-compatible base URL. */
  glmBaseUrl?: unknown
}

/**
 * Parses a model identifier into its provider and model ID components.
 *
 * Model identifiers follow the format `provider/modelId` (e.g., `minimax/MiniMax-M2.7`).
 *
 * @param model - The full model identifier string.
 * @returns An object with `provider` and `modelId`.
 * @throws Throws a 400 error if the provider is unsupported or the model ID is missing.
 */
function splitProviderModel(model: string): { provider: ProviderName; modelId: string } {
  const [provider, ...modelParts] = model.split('/')
  const modelId = modelParts.join('/')

  if (!SUPPORTED_PROVIDERS.includes(provider as ProviderName) || !modelId) {
    throw createError({
      statusCode: 400,
      statusMessage: `Unsupported model: ${model}`
    })
  }

  return { provider: provider as ProviderName, modelId }
}

/**
 * Validates that a runtime secret is present and non-empty.
 *
 * @param value - The runtime config value to check.
 * @param name - The human-readable name used in the error message.
 * @returns The validated string value.
 * @throws Throws a 500 error if the value is missing or empty.
 */
function requireRuntimeSecret(value: unknown, name: string): string {
  if (typeof value === 'string' && value.trim()) {
    return value
  }

  throw createError({
    statusCode: 500,
    statusMessage: `${name} is not configured`
  })
}

/**
 * Resolves a model identifier into an AI SDK language model instance.
 *
 * Uses the provider prefix in the model identifier to select the correct
 * provider client (MiniMax or GLM) and configures it with the appropriate
 * API key and base URL from runtime config.
 *
 * @param model - The full model identifier (e.g., `minimax/MiniMax-M2.7`).
 * @param event - The H3 event, used to access runtime configuration.
 * @returns A configured language model instance ready for use with the AI SDK.
 */
export function resolveLanguageModel(model: string, event: H3Event) {
  return resolveLanguageModelFromConfig(model, useRuntimeConfig(event))
}

/**
 * Resolves a model identifier into an AI SDK language model instance from a
 * runtime config object.
 *
 * Use this when no H3 event exists, such as Nitro background plugins.
 *
 * @param model - The full model identifier (e.g., `minimax/MiniMax-M2.7`).
 * @param config - Runtime configuration with provider credentials.
 * @returns A configured language model instance ready for use with the AI SDK.
 */
export function resolveLanguageModelFromConfig(model: string, config: LanguageModelRuntimeConfig) {
  if (!isSelectableModel(model)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Unsupported model: ${model}`
    })
  }

  const { provider, modelId } = splitProviderModel(model)

  // Configure MiniMax provider
  if (provider === 'minimax') {
    const minimax = createMinimax({
      apiKey: requireRuntimeSecret(config.minimaxApiKey, 'MiniMax API key'),
      baseURL: requireRuntimeSecret(config.minimaxBaseUrl, 'MiniMax base URL')
    })

    return minimax(modelId)
  }

  // Configure GLM (OpenAI-compatible) provider
  if (provider === 'glm') {
    const glm = createOpenAICompatible({
      name: 'glm',
      apiKey: requireRuntimeSecret(config.glmApiKey, 'GLM API key'),
      baseURL: requireRuntimeSecret(config.glmBaseUrl, 'GLM base URL').replace(/\/+$/, ''),
      headers: {
        'Accept-Language': 'en-US,en'
      }
    })

    return glm(modelId)
  }

  // Configure Ollama (OpenAI-compatible) provider
  const ollama = createOpenAICompatible({
    name: 'ollama',
    apiKey: 'ollama',
    baseURL: getOllamaOpenAIBaseUrlFromConfig(config)
  })

  return ollama(modelId)
}

/**
 * Validates that a language model can be used for chat.
 *
 * Static provider models are validated against the shared static registry.
 * Ollama models are validated against the live `/api/tags` response because
 * local models can be added or removed while the app is running.
 *
 * @param model - The full model identifier (for example `ollama/llama3.2:latest`).
 * @param event - The H3 event, used to access runtime configuration.
 */
export async function assertLanguageModelAvailable(model: string, event: H3Event): Promise<void> {
  if (!isSupportedModel(model)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Unsupported model: ${model}`
    })
  }

  if (isStaticModel(model)) {
    return
  }

  const { provider, modelId } = splitProviderModel(model)

  if (provider !== 'ollama') {
    throw createError({
      statusCode: 400,
      statusMessage: `Unsupported model: ${model}`
    })
  }

  try {
    if (await hasOllamaModel(event, modelId)) {
      return
    }
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: 'Ollama is not available'
    })
  }

  throw createError({
    statusCode: 400,
    statusMessage: `Ollama model is not available: ${modelId}`
  })
}
