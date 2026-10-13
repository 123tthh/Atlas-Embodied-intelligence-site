CREATE TABLE `automatic_papers` (
	`id` text PRIMARY KEY NOT NULL,
	`canonical` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL,
	`run_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `automatic_papers_canonical_unique` ON `automatic_papers` (`canonical`);--> statement-breakpoint
CREATE TABLE `update_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`fingerprint` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `update_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL
);
