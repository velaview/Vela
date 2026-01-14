CREATE TABLE `content_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`poster` text,
	`background` text,
	`description` text,
	`release_info` text,
	`imdb_rating` text,
	`runtime` text,
	`genres` text,
	`cast` text,
	`director` text,
	`country` text,
	`language` text,
	`popularity` integer DEFAULT 0,
	`catalog_type` text,
	`catalog_id` text,
	`fetched_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `playback_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`content_id` text NOT NULL,
	`external_id` text NOT NULL,
	`upstream_url` text NOT NULL,
	`upstream_expiry` integer NOT NULL,
	`quality` text DEFAULT '1080p',
	`source` text NOT NULL,
	`info_hash` text,
	`file_idx` integer,
	`filename` text,
	`position` integer DEFAULT 0,
	`duration` integer DEFAULT 0,
	`last_heartbeat` integer,
	`season` integer,
	`episode` integer,
	`next_episode_session_id` text,
	`status` text DEFAULT 'active',
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `resolved_streams` (
	`id` text PRIMARY KEY NOT NULL,
	`content_key` text NOT NULL,
	`source` text NOT NULL,
	`provider` text NOT NULL,
	`quality` text NOT NULL,
	`stream_url` text NOT NULL,
	`info_hash` text,
	`file_idx` integer,
	`filename` text,
	`size` integer,
	`resolved_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`last_used_at` integer,
	`use_count` integer DEFAULT 0,
	`success_count` integer DEFAULT 0,
	`failure_count` integer DEFAULT 0,
	`avg_latency` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `resolved_streams_content_key_source_quality_unique` ON `resolved_streams` (`content_key`,`source`,`quality`);--> statement-breakpoint
CREATE TABLE `user_row_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`position` integer NOT NULL,
	`archetype_id` text NOT NULL,
	`title` text NOT NULL,
	`content_type` text,
	`catalog_type` text,
	`catalog_id` text DEFAULT 'top',
	`filters` text,
	`weight` integer DEFAULT 100,
	`confidence` integer DEFAULT 80,
	`generated_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_row_templates_user_id_position_unique` ON `user_row_templates` (`user_id`,`position`);--> statement-breakpoint
ALTER TABLE `contents` ADD `tags` text;--> statement-breakpoint
ALTER TABLE `contents` ADD `age_rating` text;--> statement-breakpoint
ALTER TABLE `contents` ADD `content_rating` text DEFAULT 'safe';--> statement-breakpoint
ALTER TABLE `contents` ADD `popularity` integer;--> statement-breakpoint
ALTER TABLE `contents` ADD `release_date` text;