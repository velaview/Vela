CREATE TABLE `user_feed_state` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text NOT NULL,
	`generated_rows` text NOT NULL,
	`served_row_ids` text NOT NULL,
	`last_generated_at` integer,
	`created_at` integer NOT NULL,
	`recent_items` text DEFAULT '[]',
	`recent_row_types` text DEFAULT '[]',
	`avg_session_length` integer DEFAULT 0,
	`completion_rate` integer DEFAULT 0,
	`top_genres` text DEFAULT '[]',
	`top_languages` text DEFAULT '[]',
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `preferences` ADD `created_at` integer;--> statement-breakpoint
ALTER TABLE `preferences` ADD `updated_at` integer;--> statement-breakpoint
ALTER TABLE `preferences` ADD `preferred_studios` text;--> statement-breakpoint
ALTER TABLE `preferences` ADD `preferred_actors` text;--> statement-breakpoint
ALTER TABLE `preferences` ADD `preferred_directors` text;--> statement-breakpoint
ALTER TABLE `preferences` ADD `location` text;--> statement-breakpoint
ALTER TABLE `contents` ADD `studios` text;--> statement-breakpoint
ALTER TABLE `contents` ADD `status` text;