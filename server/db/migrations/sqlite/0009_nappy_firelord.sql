ALTER TABLE `paperless_documents` ADD `processing_model` text;--> statement-breakpoint
UPDATE `paperless_documents`
SET `processing_model` = 'minimax/MiniMax-M2.7'
WHERE `processed` = 1
  AND `processing_model` IS NULL;
