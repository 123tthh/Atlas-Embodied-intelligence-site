CREATE TABLE `bookmarks` (
	`user_id` text NOT NULL,
	`paper_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `paper_id`)
);
--> statement-breakpoint
CREATE TABLE `proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`canonical` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`review_note` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `proposals_canonical_unique` ON `proposals` (`canonical`);--> statement-breakpoint
CREATE INDEX `proposals_user` ON `proposals` (`user_id`);--> statement-breakpoint
CREATE INDEX `proposals_status` ON `proposals` (`status`);