ALTER TABLE `studySessions` ADD `status` enum('running','paused','completed','cancelled') DEFAULT 'completed' NOT NULL;--> statement-breakpoint
ALTER TABLE `studySessions` ADD `accumulatedSeconds` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `studySessions` ADD `lastResumedAt` timestamp;