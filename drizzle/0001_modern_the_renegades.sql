CREATE TABLE `auditEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`entityId` int NOT NULL,
	`action` varchar(80) NOT NULL,
	`payload` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `essayFeedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`essayId` int NOT NULL,
	`origin` varchar(40) NOT NULL,
	`totalScore` int,
	`competence1` int,
	`competence2` int,
	`competence3` int,
	`competence4` int,
	`competence5` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `essayFeedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `essayVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`essayId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`text` text,
	`origin` varchar(30) NOT NULL DEFAULT 'editor',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `essayVersions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `essays` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`examId` int,
	`title` varchar(180) NOT NULL,
	`theme` text,
	`bank` varchar(80) NOT NULL DEFAULT 'ENEM',
	`status` enum('draft','submitted_for_review','feedback_received','revision_needed','revised') NOT NULL DEFAULT 'draft',
	`currentText` text,
	`source` varchar(30) NOT NULL DEFAULT 'editor',
	`totalScore` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `essays_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`institution` varchar(120) NOT NULL,
	`date` varchar(10) NOT NULL,
	`phase` varchar(80) NOT NULL DEFAULT 'Prova principal',
	`priority` enum('principal','alta','media','baixa') NOT NULL DEFAULT 'alta',
	`color` varchar(20) NOT NULL DEFAULT 'mint',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fixedCommitments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(140) NOT NULL,
	`weekday` int NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`kind` varchar(40) NOT NULL DEFAULT 'commitment',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fixedCommitments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`type` varchar(40) NOT NULL DEFAULT 'link',
	`url` text,
	`fileKey` text,
	`source` varchar(120),
	`subject` varchar(100),
	`durationMinutes` int NOT NULL DEFAULT 50,
	`status` enum('added','available','linked','archived','unavailable') NOT NULL DEFAULT 'added',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `resources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studyBlocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`examId` int,
	`topicId` int,
	`resourceId` int,
	`title` varchar(180) NOT NULL,
	`kind` varchar(40) NOT NULL DEFAULT 'review',
	`date` varchar(10) NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`durationMinutes` int NOT NULL DEFAULT 50,
	`status` enum('planned','accepted','in_progress','completed','partially_completed','postponed','cancelled') NOT NULL DEFAULT 'planned',
	`reason` text,
	`minimumVersion` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studyBlocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studySessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`blockId` int NOT NULL,
	`startedAt` timestamp NOT NULL,
	`endedAt` timestamp,
	`actualMinutes` int,
	`confidence` int,
	`objectiveReached` int,
	`difficulty` varchar(160),
	`nextStep` text,
	`evidence` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studySessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studyWindows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`weekday` int NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`maxMinutes` int NOT NULL DEFAULT 120,
	`preference` varchar(100),
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studyWindows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `topics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`examId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`subject` varchar(100) NOT NULL,
	`status` enum('not_started','in_progress','review','needs_help','done') NOT NULL DEFAULT 'not_started',
	`weight` int NOT NULL DEFAULT 3,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `topics_id` PRIMARY KEY(`id`)
);
