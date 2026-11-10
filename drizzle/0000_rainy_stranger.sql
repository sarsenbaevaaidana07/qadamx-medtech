CREATE TABLE `assignments` (
	`student` text PRIMARY KEY NOT NULL,
	`mentor` text NOT NULL,
	`assigned_by` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `assignments_mentor` ON `assignments` (`mentor`);--> statement-breakpoint
CREATE TABLE `document_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`revision` integer NOT NULL,
	`text` text NOT NULL,
	`status` text NOT NULL,
	`comment` text NOT NULL,
	`actor` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `document_versions_document_revision` ON `document_versions` (`document_id`,`revision`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`assigned_mentor` text,
	`kind` text NOT NULL,
	`source_id` text NOT NULL,
	`text` text NOT NULL,
	`status` text NOT NULL,
	`revision` integer NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`mutation_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `documents_owner_source` ON `documents` (`owner`,`source_id`);--> statement-breakpoint
CREATE INDEX `documents_mentor_status` ON `documents` (`assigned_mentor`,`status`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`recipient` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`document_id` text,
	`request_id` text,
	`read_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notifications_recipient_created` ON `notifications` (`recipient`,`created_at`);--> statement-breakpoint
CREATE TABLE `patient_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`client_request_id` text NOT NULL,
	`tracking_hash` text NOT NULL,
	`type` text NOT NULL,
	`body` text NOT NULL,
	`assigned_doctor` text NOT NULL,
	`status` text NOT NULL,
	`revision` integer NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `patient_requests_client_id` ON `patient_requests` (`client_request_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `patient_requests_tracking` ON `patient_requests` (`tracking_hash`);--> statement-breakpoint
CREATE INDEX `patient_requests_doctor_created` ON `patient_requests` (`assigned_doctor`,`created_at`);