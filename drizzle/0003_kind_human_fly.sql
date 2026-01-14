CREATE TABLE `episodes` (
	`id` text PRIMARY KEY NOT NULL,
	`content_id` text NOT NULL,
	`external_id` text NOT NULL,
	`season` integer NOT NULL,
	`episode` integer NOT NULL,
	`title` text,
	`description` text,
	`thumbnail` text,
	`air_date` text,
	`runtime` integer,
	`fetched_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`content_id`) REFERENCES `contents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `episodes_content_id_season_episode_unique` ON `episodes` (`content_id`,`season`,`episode`);--> statement-breakpoint
CREATE TABLE `stream_audio_tracks` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`track_index` integer NOT NULL,
	`language` text NOT NULL,
	`language_name` text,
	`codec` text,
	`channels` text,
	`is_default` integer DEFAULT false,
	`fetched_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `playback_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stream_audio_tracks_session_id_track_index_unique` ON `stream_audio_tracks` (`session_id`,`track_index`);--> statement-breakpoint
CREATE TABLE `watch_room_members` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'guest',
	`joined_at` integer NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `watch_rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `watch_room_members_room_id_user_id_unique` ON `watch_room_members` (`room_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `watch_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`host_user_id` text NOT NULL,
	`invite_code` text NOT NULL,
	`content_id` text,
	`content_title` text,
	`content_poster` text,
	`season` integer,
	`episode` integer,
	`control_mode` text DEFAULT 'anyone',
	`status` text DEFAULT 'waiting',
	`max_members` integer DEFAULT 10,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`host_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `watch_rooms_invite_code_unique` ON `watch_rooms` (`invite_code`);