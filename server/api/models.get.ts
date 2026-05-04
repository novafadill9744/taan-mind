import type { H3Event } from 'h3'
import type { ModelId, ModelOption, ModelsResponse } from '#shared/utils/models'
import {
  DOCUMENT_PROCESSING_MODELS,
  MODELS,
  isSelectableOllamaModelName
} from '#shared/utils/models'
import { listOllamaModels } from '../utils/ollama'

/**
 * GET /api/models
 *
 * Lists selectable models. Chat scope includes all chat models, while
 * document-processing scope excludes chat-only providers such as Nova.
 * Ollama models are appended only when the configured Ollama instance is
 * reachable. OCR-only Ollama models are intentionally excluded from this list.
 */
export default defineEventHandler(async (event): Promise<ModelsResponse> => {
  const scope = getQuery(event).scope === 'document-processing' ? 'document-processing' : 'chat'
  const staticModels = scope === 'document-processing' ? DOCUMENT_PROCESSING_MODELS : MODELS
  const ollamaModels = await getAvailableOllamaModelOptions(event)

  return {
    models: [...staticModels, ...ollamaModels]
  }
})

/**
 * Converts available Ollama models into UI model options.
 *
 * Ollama is optional for chat/enrichment. If it is not configured or
 * unreachable, the model list endpoint should still succeed with static
 * providers. OCR-only models stay available through `/api/ocr/models`.
 *
 * @param event - The H3 event used to access runtime configuration.
 * @returns Runtime-discovered Ollama model options.
 */
async function getAvailableOllamaModelOptions(event: H3Event): Promise<ModelOption[]> {
  try {
    const models = await listOllamaModels(event)

    return models
      .map(model => model.name.trim())
      .filter(
        (name, index, names) =>
          name.length > 0 && names.indexOf(name) === index && isSelectableOllamaModelName(name)
      )
      .sort((a, b) => a.localeCompare(b))
      .map(name => ({
        label: `Ollama: ${name}`,
        value: `ollama/${name}` as ModelId,
        icon: 'i-lucide-server-cog',
        provider: 'ollama',
        dynamic: true
      }))
  } catch {
    return []
  }
}
