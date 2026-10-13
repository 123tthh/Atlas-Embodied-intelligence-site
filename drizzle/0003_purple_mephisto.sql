CREATE TABLE `visit_days` (
	`day` text NOT NULL,
	`visitor_hash` text NOT NULL,
	`source` text NOT NULL,
	`pageviews` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`day`, `visitor_hash`)
);
--> statement-breakpoint
CREATE INDEX `visit_days_source_day` ON `visit_days` (`source`,`day`);--> statement-breakpoint
CREATE TABLE `visit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`fingerprint` text NOT NULL,
	`created_at` integer NOT NULL,
	`applied` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `visit_events_created` ON `visit_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `visit_visitors` (
	`visitor_hash` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`first_seen` integer NOT NULL,
	`last_seen` integer NOT NULL,
	`pageviews` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `visit_visitors_source` ON `visit_visitors` (`source`);