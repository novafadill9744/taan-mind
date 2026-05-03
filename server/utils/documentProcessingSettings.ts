/**
 * @file Global document processing settings persistence.
 *
 * Manages the app-wide AI model selection used by the Paperless document
 * enrichment pipeline. Settings are stored in the `app_settings` SQLite table
 * because background processors run outside of any user session.
 */
import { db, schema } from 'hub:db'
import { eq } from 'drizzle-orm'
import type { DocumentProcessingSettings, ModelId } from '#shared/utils/models'
import {
  DEFAULT_DOCUMENT_PROCESSING_MODEL,
  DOCUMENT_PROCESSING_MODEL_SETTING_KEY,
  isSelectableModel
} from '#shared/utils/models'

/**
 * Reads the global model used by the Paperless document enrichment pipeline.
 *
 * The background processor is not tied to a user request, so this setting is
 * intentionally app-wide instead of session-scoped.
 */
export async function getDocumentProcessingSettings(): Promise<DocumentProcessingSettings> {
  const [setting] = await db
    .select({ value: schema.appSettings.value })
    .from(schema.appSettings)
    .where(eq(schema.appSettings.key, DOCUMENT_PROCESSING_MODEL_SETTING_KEY))
    .limit(1)

  const enrichmentModel = setting?.value

  if (enrichmentModel && isSelectableModel(enrichmentModel)) {
    return { enrichmentModel }
  }

  return { enrichmentModel: DEFAULT_DOCUMENT_PROCESSING_MODEL }
}

/**
 * Persists the global model used by the Paperless document enrichment pipeline.
 *
 * @param enrichmentModel - Supported model identifier in provider/model format.
 * @returns The saved document processing settings.
 */
export async function setDocumentProcessingEnrichmentModel(
  enrichmentModel: ModelId
): Promise<DocumentProcessingSettings> {
  const now = new Date()

  await db
    .insert(schema.appSettings)
    .values({
      key: DOCUMENT_PROCESSING_MODEL_SETTING_KEY,
      value: enrichmentModel,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: schema.appSettings.key,
      set: {
        value: enrichmentModel,
        updatedAt: now
      }
    })

  return { enrichmentModel }
}
