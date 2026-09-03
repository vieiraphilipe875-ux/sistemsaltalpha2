ALTER TABLE `clients` ADD `due_day` integer DEFAULT 5 NOT NULL;
PRAGMA optimize;
