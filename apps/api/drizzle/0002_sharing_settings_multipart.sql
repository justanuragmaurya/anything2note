CREATE TABLE `reminder_log` (
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`day` integer NOT NULL,
	`sent_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `kind`, `day`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `shares` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shares_user_source_idx` ON `shares` (`user_id`,`source_id`);--> statement-breakpoint
CREATE TABLE `user_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`default_note_type` text DEFAULT 'auto' NOT NULL,
	`language` text DEFAULT 'auto' NOT NULL,
	`delete_originals` integer DEFAULT false NOT NULL,
	`email_notes_ready` integer DEFAULT true NOT NULL,
	`email_reminders` integer DEFAULT true NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `uploads` ADD `multipart_id` text;--> statement-breakpoint
ALTER TABLE `uploads` ADD `completed_at` integer;