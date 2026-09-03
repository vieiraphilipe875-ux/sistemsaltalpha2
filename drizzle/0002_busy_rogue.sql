ALTER TABLE `deliverables` ADD `has_stories_version` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `members` ADD `password_hash` text;--> statement-breakpoint
ALTER TABLE `members` ADD `setup_token` text;