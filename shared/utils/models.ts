/**
 * @file AI model registry, type definitions, and validation helpers.
 *
 * Defines the static model catalog (MiniMax, GLM, Nova), dynamic Ollama model support,
 * document processing settings types, and type guards used across server and client
 * to validate and resolve model identifiers.
 */
/** Supported AI model provider names. */
export type ModelProvider = 'minimax' | 'glm' | 'nova' | 'ollama'

/** Union of all statically configured model identifiers in `provider/modelId` format. */
export type StaticModelId =
  | 'minimax/MiniMax-M2.7'
  | 'glm/glm-5'
  | 'glm/glm-5.1'
  | 'glm/glm-5-turbo'
  | 'nova/nova-2-lite-v1'
  | 'nova/nova-micro-v1'
  | 'nova/nova-lite-v1'
  | 'nova/nova-pro-v1'
  | 'nova/nova-premier-v1'

/** Dynamic Ollama model identifier in `ollama/modelName` format. */
export type OllamaModelId = `ollama/${string}`

/** Union of all supported model identifiers in `provider/modelId` format. */
export type ModelId = StaticModelId | OllamaModelId

/** Represents a selectable model option in the UI. */
export interface ModelOption {
  /** Human-readable display name. */
  label: string
  /** Unique model identifier in `provider/modelId` format. */
  value: ModelId
  /** Lucide icon class for the model. */
  icon: string
  /** Provider that serves this model. */
  provider: ModelProvider
  /** Whether the model was discovered at runtime instead of configured statically. */
  dynamic?: boolean
}

/** Response returned by the model listing API. */
export interface ModelsResponse {
  /** Models currently selectable by the user. */
  models: ModelOption[]
}

/** All available AI models selectable by chat users. */
export const MODELS: ModelOption[] = [
  {
    label: 'MiniMax M2.7',
    value: 'minimax/MiniMax-M2.7',
    icon: 'i-lucide-brain-circuit',
    provider: 'minimax'
  },
  { label: 'GLM 5', value: 'glm/glm-5', icon: 'i-lucide-sparkles', provider: 'glm' },
  { label: 'GLM 5.1', value: 'glm/glm-5.1', icon: 'i-lucide-sparkles', provider: 'glm' },
  { label: 'GLM 5 Turbo', value: 'glm/glm-5-turbo', icon: 'i-lucide-bot', provider: 'glm' },
  {
    label: 'Amazon Nova 2 Lite',
    value: 'nova/nova-2-lite-v1',
    icon: 'i-lucide-cloud',
    provider: 'nova'
  },
  {
    label: 'Amazon Nova Micro',
    value: 'nova/nova-micro-v1',
    icon: 'i-lucide-cloud',
    provider: 'nova'
  },
  {
    label: 'Amazon Nova Lite',
    value: 'nova/nova-lite-v1',
    icon: 'i-lucide-cloud',
    provider: 'nova'
  },
  {
    label: 'Amazon Nova Pro',
    value: 'nova/nova-pro-v1',
    icon: 'i-lucide-cloud',
    provider: 'nova'
  },
  {
    label: 'Amazon Nova Premier',
    value: 'nova/nova-premier-v1',
    icon: 'i-lucide-cloud',
    provider: 'nova'
  }
]

/** The default model used when no selection has been made. */
export const DEFAULT_MODEL = MODELS[0]!.value

/** Models allowed for background document enrichment after OCR. */
export const DOCUMENT_PROCESSING_MODELS = MODELS.filter(model => model.provider !== 'nova')

/** Nova models that support the `reasoning_effort` API parameter. */
export const NOVA_REASONING_MODELS: ModelId[] = ['nova/nova-2-lite-v1']

/** Case-insensitive marker used by Ollama OCR-only model names. */
const OCR_MODEL_NAME_MARKER = 'ocr'

/** Server-side setting key for the Paperless document enrichment model. */
export const DOCUMENT_PROCESSING_MODEL_SETTING_KEY = 'document_processing_model'

/** Default enrichment model used by the Paperless document processor. */
export const DEFAULT_DOCUMENT_PROCESSING_MODEL = DEFAULT_MODEL

/** Server-side Paperless document processing settings editable from the UI. */
export interface DocumentProcessingSettings {
  /** Model used after OCR to format text and extract Paperless metadata. */
  enrichmentModel: ModelId
}

/** Payload accepted when updating document processing settings. */
export interface DocumentProcessingSettingsPayload {
  /** Model used after OCR to format text and extract Paperless metadata. */
  enrichmentModel: ModelId
}

/**
 * Checks whether an Ollama model name is intended only for OCR extraction.
 *
 * @param value - Raw Ollama model name, for example `glm-ocr:latest`.
 * @returns `true` when the model name contains `ocr`, case-insensitive.
 */
export function isOcrOnlyModelName(value: string): boolean {
  return value.toLowerCase().includes(OCR_MODEL_NAME_MARKER)
}

/**
 * Checks whether an Ollama model should appear in chat/enrichment selectors.
 *
 * OCR-only models remain available through `/api/ocr/models`, but are hidden
 * from general model selectors because they only extract document content.
 *
 * @param value - Raw Ollama model name.
 * @returns `true` when the model can be selected for chat/enrichment.
 */
export function isSelectableOllamaModelName(value: string): boolean {
  return !isOcrOnlyModelName(value)
}

/**
 * Type guard that checks whether a string is a statically configured model ID.
 *
 * @param value - The string to check.
 * @returns `true` if the value matches a static model ID.
 */
export function isStaticModel(value: string): value is StaticModelId {
  return MODELS.some(model => model.value === value)
}

/**
 * Type guard that checks whether a string has the dynamic Ollama model ID shape.
 *
 * @param value - The string to check.
 * @returns `true` if the value uses `ollama/<modelName>` with a non-empty model name.
 */
export function isOllamaModel(value: string): value is OllamaModelId {
  const [provider, ...modelParts] = value.split('/')
  return provider === 'ollama' && modelParts.join('/').trim().length > 0
}

/**
 * Type guard that checks whether a string has a supported model ID shape.
 *
 * Runtime-discovered models still need server-side availability validation
 * before use because Ollama models can be added or removed while the app runs.
 *
 * @param value - The string to check.
 * @returns `true` if the value is a static model ID or a dynamic Ollama model ID.
 */
export function isSupportedModel(value: string): value is ModelId {
  return isStaticModel(value) || isOllamaModel(value)
}

/**
 * Type guard that checks whether a model can appear in chat/enrichment selectors.
 *
 * Static provider models are selectable. Runtime Ollama models are selectable
 * only when they are not OCR-only models.
 *
 * @param value - The model ID to check.
 * @returns `true` if the model can be selected for chat/enrichment.
 */
export function isSelectableModel(value: string): value is ModelId {
  if (!isSupportedModel(value)) {
    return false
  }

  if (isOllamaModel(value)) {
    const [, ...modelParts] = value.split('/')
    return isSelectableOllamaModelName(modelParts.join('/'))
  }

  return true
}

/**
 * Type guard that checks whether a model can be used for document enrichment.
 *
 * Nova models are chat-only for now, so background document processing keeps
 * using MiniMax, GLM, or non-OCR Ollama models.
 *
 * @param value - The model ID to check.
 * @returns `true` if the model can be selected for document processing.
 */
export function isDocumentProcessingModel(value: string): value is ModelId {
  if (!isSelectableModel(value)) {
    return false
  }

  const [provider] = value.split('/')
  return provider !== 'nova'
}

/**
 * Type guard that checks whether a model supports Nova extended reasoning.
 *
 * Keep this allow-list explicit because unsupported Nova models reject requests
 * that include `reasoning_effort`.
 *
 * @param value - The model ID to check.
 * @returns `true` if the Nova model supports reasoning.
 */
export function isNovaReasoningModel(value: string): value is ModelId {
  return NOVA_REASONING_MODELS.some(model => model === value)
}
