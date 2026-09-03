ALTER TABLE `members` ADD `client_access_mode` text DEFAULT 'selected' NOT NULL;

CREATE TABLE `member_permissions` (
	`member_id` text NOT NULL,
	`permission` text NOT NULL,
	PRIMARY KEY(`member_id`, `permission`),
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX `idx_member_permissions_member` ON `member_permissions` (`member_id`);

PRAGMA optimize;
