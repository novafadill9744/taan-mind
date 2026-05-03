<!--
  PersonalitiesModal.vue - Settings modal for AI personalization and document processing
  Provides a three-section interface:
  1. Document processing: select the enrichment model used after OCR to format
     content and suggest Paperless metadata.
  2. Personality editor: create/edit custom AI personalities with markdown prompts
     that become system prompt text. Enforces a maximum quota of custom personalities.
  3. Personality list: table of existing custom personalities with edit/delete actions.
-->
<script setup lang="ts">
import type { ModelId } from '#shared/utils/models'
import type { CustomPersonality } from '#shared/utils/personalities'
import { DEFAULT_DOCUMENT_PROCESSING_MODEL } from '#shared/utils/models'
import {
  DEFAULT_PERSONALITY,
  MAX_CUSTOM_PERSONALITIES,
  MAX_CUSTOM_PERSONALITY_PROMPT_LENGTH,
  toCustomPersonalityValue
} from '#shared/utils/personalities'

/** Emits a close event when the user dismisses the modal */
const emit = defineEmits<{ close: [] }>()

/** Toast notification utility */
const toast = useToast()

/**
 * Custom personalities composable: provides CRUD operations and
 * reactive access to the user's custom personality definitions.
 */
const {
  customPersonalities,
  create,
  update,
  remove,
  refresh: refreshCustomPersonalities,
  status: personalitiesStatus
} = useCustomPersonalities()

/** Currently selected personality (shared reactive state) */
const { personality } = usePersonality()

/**
 * Document processing settings composable: provides access to
 * available processing models, current settings, and update functionality.
 */
const {
  models: processingModels,
  settings: processingSettings,
  status: processingStatus,
  modelsStatus: processingModelsStatus,
  update: updateProcessingSettings
} = useDocumentProcessingSettings()

/** ID of the personality currently being edited (null when not editing) */
const editingId = shallowRef<string | null>(null)
/** Name/label input for the personality being created or edited */
const label = shallowRef('')
/** Markdown prompt text for the personality being created or edited */
const prompt = shallowRef('')
/** Whether a save/create operation is currently in progress */
const saving = shallowRef(false)
/** ID of the personality currently being deleted (null when idle) */
const deletingId = shallowRef<string | null>(null)
/** Currently selected document processing model */
const processingModel = shallowRef<ModelId>(DEFAULT_DOCUMENT_PROCESSING_MODEL)
/** Whether the processing model settings save operation is in progress */
const savingProcessingSettings = shallowRef(false)

/** Whether the form is in edit mode (as opposed to create mode) */
const isEditing = computed(() => editingId.value !== null)
/** Current count of user-created custom personalities */
const customCount = computed(() => customPersonalities.value?.length ?? 0)
/** Number of remaining personality slots available before hitting the quota */
const remainingSlots = computed(() => Math.max(MAX_CUSTOM_PERSONALITIES - customCount.value, 0))
/** Current character count of the prompt textarea */
const promptLength = computed(() => prompt.value.length)
/** Whether the prompt exceeds the maximum allowed character length */
const promptTooLong = computed(() => promptLength.value > MAX_CUSTOM_PERSONALITY_PROMPT_LENGTH)
/** Whether the create button is disabled because the personality quota is full */
const createDisabledByQuota = computed(() => !isEditing.value && remainingSlots.value === 0)
/** Whether the personality form can be submitted (all validations pass) */
const canSave = computed(
  () =>
    !saving.value &&
    !createDisabledByQuota.value &&
    label.value.trim().length > 0 &&
    prompt.value.trim().length > 0 &&
    !promptTooLong.value
)
/** The enrichment model currently saved on the server */
const currentProcessingModel = computed(
  () => processingSettings.value?.enrichmentModel ?? DEFAULT_DOCUMENT_PROCESSING_MODEL
)
/** Display info for the currently selected processing model option */
const selectedProcessingModel = computed(() =>
  processingModels.value.find(option => option.value === processingModel.value)
)
/** Whether the selected processing model exists in the available models list */
const processingModelIsAvailable = computed(() =>
  processingModels.value.some(option => option.value === processingModel.value)
)
/** Whether the processing model settings can be saved (model changed and available) */
const canSaveProcessingSettings = computed(
  () =>
    !savingProcessingSettings.value &&
    processingModelIsAvailable.value &&
    processingModel.value !== currentProcessingModel.value
)

/**
 * Sync the local processing model selection with the server-side setting.
 * Runs immediately on mount and whenever the server value changes.
 */
watch(
  currentProcessingModel,
  value => {
    processingModel.value = value
  },
  { immediate: true }
)

/**
 * Extracts a human-readable error message from an API error response.
 * Checks for structured error data first, then falls back to a generic message.
 */
function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { statusMessage?: string; message?: string } }).data
    return data?.statusMessage || data?.message || 'Could not save settings'
  }

  return 'Could not save settings'
}

/** Resets the personality form to its default (create) state */
function resetForm() {
  editingId.value = null
  label.value = ''
  prompt.value = ''
}

/**
 * Populates the form with an existing personality's data for editing.
 * @param item - The custom personality to edit
 */
function editPersonality(item: CustomPersonality) {
  editingId.value = item.id
  label.value = item.label
  prompt.value = item.prompt
}

/**
 * Generates a truncated preview of a personality prompt for display in the table.
 * Normalizes whitespace and caps at 96 characters with an ellipsis.
 */
function getPromptPreview(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > 96 ? `${normalized.slice(0, 96)}…` : normalized
}

/**
 * Creates a new personality or updates an existing one via the API.
 * Shows a success toast on completion or an error toast on failure.
 */
async function savePersonality() {
  if (!canSave.value) return

  saving.value = true
  try {
    const body = {
      label: label.value.trim(),
      prompt: prompt.value
    }

    if (editingId.value) {
      await update(editingId.value, body)
      toast.add({
        title: 'Personality updated',
        icon: 'i-lucide-check'
      })
    } else {
      await create(body)
      toast.add({
        title: 'Personality added',
        description: 'It now appears in the chat selector',
        icon: 'i-lucide-sparkles'
      })
    }

    resetForm()
  } catch (error) {
    toast.add({
      title: 'Error',
      description: getErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    saving.value = false
  }
}

/**
 * Saves the selected document processing model to the server.
 * Shows a success toast on completion or an error toast on failure.
 */
async function saveProcessingSettings() {
  if (!canSaveProcessingSettings.value) return

  savingProcessingSettings.value = true
  try {
    await updateProcessingSettings({ enrichmentModel: processingModel.value })
    toast.add({
      title: 'Processing model updated',
      description: 'New documents will use the selected model after OCR',
      icon: 'i-lucide-check'
    })
  } catch (error) {
    toast.add({
      title: 'Error',
      description: getErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    savingProcessingSettings.value = false
  }
}

/**
 * Deletes a custom personality via the API.
 * If the deleted personality is currently selected, resets to the default personality.
 * If the deleted personality is being edited, resets the form.
 */
async function deletePersonality(item: CustomPersonality) {
  deletingId.value = item.id
  try {
    await remove(item.id)

    if (personality.value === toCustomPersonalityValue(item.id)) {
      personality.value = DEFAULT_PERSONALITY
    }

    if (editingId.value === item.id) {
      resetForm()
    }

    toast.add({
      title: 'Personality deleted',
      icon: 'i-lucide-trash'
    })
  } catch (error) {
    toast.add({
      title: 'Error',
      description: getErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <UModal
    title="Settings"
    description="Configure chat personalization and the model used to enrich Paperless documents after OCR."
    :ui="{
      content: 'sm:max-w-3xl',
      footer: 'justify-between'
    }"
  >
    <template #body>
      <div class="space-y-6">
        <section class="rounded-2xl border border-default bg-elevated/40 p-4">
          <div class="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 class="text-sm font-semibold text-highlighted">Document processing</h3>
              <p class="mt-1 text-xs text-muted">
                Choose the model used after OCR to format content and suggest Paperless metadata.
              </p>
            </div>
            <UBadge color="neutral" variant="soft">
              {{ selectedProcessingModel?.label ?? currentProcessingModel }}
            </UBadge>
          </div>

          <div class="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <UFormField
              label="Enrichment model"
              description="Applies to new background processing runs. OCR model selection is unchanged."
              class="w-full"
            >
              <USelectMenu
                v-model="processingModel"
                :items="processingModels"
                value-key="value"
                icon="i-lucide-brain-circuit"
                :disabled="
                  savingProcessingSettings ||
                  processingStatus === 'pending' ||
                  processingModelsStatus === 'pending'
                "
                class="w-full"
              />
            </UFormField>

            <UButton
              label="Save model"
              icon="i-lucide-save"
              :loading="savingProcessingSettings"
              :disabled="!canSaveProcessingSettings"
              @click="saveProcessingSettings"
            />
          </div>

          <UAlert
            v-if="!processingModelIsAvailable"
            color="warning"
            variant="soft"
            icon="i-lucide-circle-alert"
            title="Model unavailable"
            description="Pick one of the currently available models before saving."
            class="mt-4"
          />
        </section>

        <section class="rounded-2xl border border-default bg-elevated/40 p-4">
          <div class="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 class="text-sm font-semibold text-highlighted">
                {{ isEditing ? 'Edit personality' : 'New personality' }}
              </h3>
              <p class="mt-1 text-xs text-muted">Markdown is preserved as system prompt text.</p>
            </div>
            <UBadge color="neutral" variant="soft">
              {{ customCount }}/{{ MAX_CUSTOM_PERSONALITIES }}
            </UBadge>
          </div>

          <UAlert
            v-if="createDisabledByQuota"
            color="warning"
            variant="soft"
            icon="i-lucide-info"
            title="Limit reached"
            description="Delete a personality or edit an existing one to make changes."
            class="mb-4"
          />

          <div class="grid gap-4">
            <UFormField label="Name" required class="w-full">
              <UInput
                v-model="label"
                maxlength="60"
                placeholder="e.g. Financial analyst"
                :disabled="createDisabledByQuota || saving"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Markdown prompt"
              required
              :error="
                promptTooLong
                  ? `Maximum ${MAX_CUSTOM_PERSONALITY_PROMPT_LENGTH} characters`
                  : undefined
              "
              class="w-full"
            >
              <UTextarea
                v-model="prompt"
                autoresize
                :rows="6"
                :maxrows="10"
                :maxlength="MAX_CUSTOM_PERSONALITY_PROMPT_LENGTH"
                placeholder="# Personality&#10;- Respond with a clear tone&#10;- Use lists when helpful&#10;- Maintain context and precision"
                :disabled="createDisabledByQuota || saving"
                class="w-full"
              />
              <template #hint>
                <span :class="promptTooLong ? 'text-error' : 'text-muted'">
                  {{ promptLength }}/{{ MAX_CUSTOM_PERSONALITY_PROMPT_LENGTH }}
                </span>
              </template>
            </UFormField>

            <div class="flex justify-end gap-2">
              <UButton
                v-if="isEditing"
                color="neutral"
                variant="ghost"
                label="Cancel"
                :disabled="saving"
                @click="resetForm"
              />
              <UButton
                :label="isEditing ? 'Save changes' : 'Add personality'"
                icon="i-lucide-save"
                :loading="saving"
                :disabled="!canSave"
                @click="savePersonality"
              />
            </div>
          </div>
        </section>

        <section>
          <div class="mb-3 flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-highlighted">Custom personalities</h3>
              <p class="text-xs text-muted">Only your custom personalities are shown.</p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-refresh-cw"
              :loading="personalitiesStatus === 'pending'"
              @click="refreshCustomPersonalities()"
            />
          </div>

          <div class="overflow-hidden rounded-2xl border border-default">
            <table class="min-w-full divide-y divide-default text-sm">
              <thead class="bg-elevated/70 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th class="px-4 py-3 font-medium">Name</th>
                  <th class="px-4 py-3 font-medium">Prompt</th>
                  <th class="w-28 px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-default">
                <tr v-if="customPersonalities.length === 0">
                  <td colspan="3" class="px-4 py-8 text-center text-muted">
                    You do not have custom personalities yet.
                  </td>
                </tr>
                <tr v-for="item in customPersonalities" :key="item.id" class="bg-default/40">
                  <td class="px-4 py-3 font-medium text-highlighted">
                    {{ item.label }}
                  </td>
                  <td class="max-w-md px-4 py-3 text-muted">
                    <span class="line-clamp-2">{{ getPromptPreview(item.prompt) }}</span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex justify-end gap-1">
                      <UButton
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        icon="i-lucide-pencil"
                        aria-label="Edit personality"
                        @click="editPersonality(item)"
                      />
                      <UButton
                        color="error"
                        variant="ghost"
                        size="xs"
                        icon="i-lucide-trash"
                        aria-label="Delete personality"
                        :loading="deletingId === item.id"
                        @click="deletePersonality(item)"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </template>

    <template #footer>
      <p class="text-xs text-muted">{{ remainingSlots }} personality slots available.</p>
      <UButton color="neutral" variant="ghost" label="Close" @click="emit('close')" />
    </template>
  </UModal>
</template>
