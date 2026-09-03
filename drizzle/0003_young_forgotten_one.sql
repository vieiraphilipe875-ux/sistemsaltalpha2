CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`category` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`due_date` text NOT NULL,
	`client_id` text,
	`description` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_transactions_client_id` ON `transactions` (`client_id`);--> statement-breakpoint
ALTER TABLE `clients` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `contact_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `phone` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `email` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `revenue` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `notes` text DEFAULT '' NOT NULL;