CREATE TABLE `room_chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`user_id` text NOT NULL,
	`message` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `watch_rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `room_member_readiness` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`user_id` text NOT NULL,
	`is_ready` integer DEFAULT false,
	`buffer_percent` integer DEFAULT 0,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `watch_rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `room_member_readiness_room_id_user_id_unique` ON `room_member_readiness` (`room_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `room_playback_state` (
	`room_id` text PRIMARY KEY NOT NULL,
	`position` integer DEFAULT 0,
	`is_playing` integer DEFAULT false,
	`last_action` text,
	`last_action_by` text,
	`last_action_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `watch_rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `watch_friends` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`friend_user_id` text NOT NULL,
	`added_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`friend_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `watch_friends_user_id_friend_user_id_unique` ON `watch_friends` (`user_id`,`friend_user_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `nickname` text;