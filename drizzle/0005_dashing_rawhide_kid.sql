CREATE TABLE `essayParts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`essayId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`color` varchar(30) NOT NULL DEFAULT 'blue',
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `essayParts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `studyBlocks` ADD `essayId` int;