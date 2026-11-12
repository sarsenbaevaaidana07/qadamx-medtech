CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`role` text NOT NULL,
	`action` text NOT NULL,
	`target` text DEFAULT '' NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_log_created` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `document_meta` (
	`document_id` text PRIMARY KEY NOT NULL,
	`template` text DEFAULT '' NOT NULL,
	`fields` text DEFAULT '{}' NOT NULL,
	`scores` text DEFAULT '{}' NOT NULL,
	`active_ms` integer DEFAULT 0 NOT NULL,
	`opened_at` text,
	`approved_at` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pilot_leads` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`organization` text NOT NULL,
	`role` text NOT NULL,
	`contact` text NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `pilot_leads_created` ON `pilot_leads` (`created_at`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`login` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`specialty` text DEFAULT '' NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`photo` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_accounts` (
	`login` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`name` text NOT NULL,
	`salt` text NOT NULL,
	`hash` text NOT NULL,
	`version` integer NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `version_meta` (
	`document_id` text NOT NULL,
	`revision` integer NOT NULL,
	`fields` text DEFAULT '{}' NOT NULL,
	`scores` text DEFAULT '{}' NOT NULL,
	`active_ms` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `version_meta_document_revision` ON `version_meta` (`document_id`,`revision`);