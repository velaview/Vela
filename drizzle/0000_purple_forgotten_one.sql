-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `addons` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`addon_id` text NOT NULL,
	`manifest_url` text NOT NULL,
	`manifest` text NOT NULL,
	`enabled` integer DEFAULT true,
	`position` integer DEFAULT 0,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `addons_user_id_addon_id_unique` ON `addons` (`user_id`,`addon_id`);--> statement-breakpoint
CREATE TABLE `history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`content_id` text NOT NULL,
	`content_type` text NOT NULL,
	`title` text NOT NULL,
	`poster` text,
	`season` integer,
	`episode` integer,
	`episode_title` text,
	`position` integer NOT NULL,
	`duration` integer NOT NULL,
	`watched_at` integer NOT NULL,
	`completed` integer DEFAULT false,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `history_user_id_content_id_season_episode_unique` ON `history` (`user_id`,`content_id`,`season`,`episode`);--> statement-breakpoint
CREATE TABLE `library` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`content_id` text NOT NULL,
	`content_type` text NOT NULL,
	`title` text NOT NULL,
	`poster` text,
	`added_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `library_user_id_content_id_unique` ON `library` (`user_id`,`content_id`);--> statement-breakpoint
CREATE TABLE `preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`theme` text DEFAULT 'dark',
	`language` text DEFAULT 'en',
	`autoplay_next` integer DEFAULT true,
	`autoplay_previews` integer DEFAULT true,
	`default_quality` text DEFAULT 'auto',
	`subtitle_lang` text DEFAULT 'en',
	`maturity_level` text DEFAULT 'all',
	`torbox_key_encrypted` text,
	`onboarding_completed` integer DEFAULT false,
	`preferred_types` text,
	`preferred_regions` text,
	`preferred_genres` text,
	`preferred_vibes` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`display_name` text NOT NULL,
	`avatar` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `catalog_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`content_id` text NOT NULL,
	`catalog_type` text NOT NULL,
	`catalog_id` text NOT NULL,
	`addon_id` text NOT NULL,
	`page` integer DEFAULT 0,
	`position` integer NOT NULL,
	`extra_key` text DEFAULT '',
	`fetched_at` integer NOT NULL,
	FOREIGN KEY (`content_id`) REFERENCES `contents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `contents` (
	`id` text PRIMARY KEY NOT NULL,
	`external_id` text NOT NULL,
	`external_source` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`poster` text,
	`background` text,
	`description` text,
	`year` text,
	`imdb_rating` text,
	`genres` text,
	`runtime` integer,
	`trailer` text,
	`country` text,
	`language` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`cast` text,
	`director` text,
	`logo` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contents_external_id_external_source_unique` ON `contents` (`external_id`,`external_source`);--> statement-breakpoint
CREATE TABLE `meta_cache` (
	`content_id` text PRIMARY KEY NOT NULL,
	`addon_id` text NOT NULL,
	`meta_json` text NOT NULL,
	`fetched_at` integer NOT NULL,
	FOREIGN KEY (`content_id`) REFERENCES `contents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `search_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`query` text NOT NULL,
	`type` text DEFAULT 'all',
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `stream_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`content_id` text NOT NULL,
	`source` text NOT NULL,
	`quality` text,
	`url` text NOT NULL,
	`extra` text,
	`fetched_at` integer NOT NULL,
	`expires_at` integer,
	`filename` text,
	FOREIGN KEY (`content_id`) REFERENCES `contents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `system_addons` (
	`id` text PRIMARY KEY NOT NULL,
	`addon_id` text NOT NULL,
	`manifest_url` text NOT NULL,
	`manifest` text NOT NULL,
	`enabled` integer DEFAULT true,
	`category` text NOT NULL,
	`position` integer DEFAULT 0,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subtitle_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`content_id` text NOT NULL,
	`language` text NOT NULL,
	`url` text NOT NULL,
	`format` text DEFAULT 'srt',
	`fetched_at` integer NOT NULL,
	FOREIGN KEY (`content_id`) REFERENCES `contents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_homepage_rows` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`row_id` text NOT NULL,
	`title` text NOT NULL,
	`type` text NOT NULL,
	`catalog_type` text,
	`catalog_id` text,
	`source` text,
	`extra` text,
	`priority` integer DEFAULT 0,
	`is_active` integer DEFAULT true,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_homepage_rows_user_id_row_id_unique` ON `user_homepage_rows` (`user_id`,`row_id`);
*/