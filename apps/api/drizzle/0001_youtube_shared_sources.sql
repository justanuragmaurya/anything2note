DROP INDEX `generations_source_output_idx`;--> statement-breakpoint
ALTER TABLE `generations` ADD `variant` text DEFAULT 'shared' NOT NULL;--> statement-breakpoint
ALTER TABLE `generations` ADD `run_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `generations_key_idx` ON `generations` (`source_id`,`variant`,`note_type`,`language`,`output_type`);--> statement-breakpoint
ALTER TABLE `sources` ADD `processing_by` text;--> statement-breakpoint
CREATE UNIQUE INDEX `sources_shared_ref_idx` ON `sources` (`kind`,`source_ref`) WHERE visibility = 'shared';--> statement-breakpoint
ALTER TABLE `user_sources` ADD `status` text DEFAULT 'queued' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_sources` ADD `progress` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_sources` ADD `error` text;--> statement-breakpoint
ALTER TABLE `user_sources` ADD `updated_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Every existing source is private with one library entry, so its status moves over as-is.
UPDATE `user_sources` SET `status` = s.`status`, `progress` = s.`progress`, `error` = s.`error`, `updated_at` = s.`updated_at`
FROM `sources` s WHERE s.`id` = `user_sources`.`source_id`;--> statement-breakpoint
UPDATE `sources` SET `status` = 'ready' WHERE `content_r2_key` IS NOT NULL;--> statement-breakpoint
-- Items made with custom instructions keep their outputs as that user's own variant.
UPDATE `generations` SET `variant` = us.`user_id`
FROM `user_sources` us WHERE us.`source_id` = `generations`.`source_id` AND us.`instructions` IS NOT NULL;
