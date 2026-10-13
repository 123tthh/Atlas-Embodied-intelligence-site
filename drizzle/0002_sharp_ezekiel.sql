CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`message` text NOT NULL,
	`fingerprint` text NOT NULL,
	`client_hash` text NOT NULL,
	`source` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `messages_client_created` ON `messages` (`client_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `messages_status_created` ON `messages` (`status`,`created_at`);