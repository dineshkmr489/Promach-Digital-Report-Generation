CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`report_no` text NOT NULL,
	`action` text NOT NULL,
	`actor_name` text NOT NULL,
	`channel` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`report_no`) REFERENCES `service_reports`(`report_no`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `checklist_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`equipment_type` text NOT NULL,
	`items_json` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`contact_name` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`location_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`brand` text DEFAULT '' NOT NULL,
	`model` text DEFAULT '' NOT NULL,
	`serial` text DEFAULT '' NOT NULL,
	`checklist_template_id` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`checklist_template_id`) REFERENCES `checklist_templates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`name` text NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `report_signatures` (
	`id` text PRIMARY KEY NOT NULL,
	`report_no` text NOT NULL,
	`signer_name` text NOT NULL,
	`signer_email` text DEFAULT '' NOT NULL,
	`designation` text DEFAULT '' NOT NULL,
	`signed_at` text NOT NULL,
	`channel` text NOT NULL,
	`signature_data_url` text,
	`consent_text` text NOT NULL,
	FOREIGN KEY (`report_no`) REFERENCES `service_reports`(`report_no`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `signature_report_idx` ON `report_signatures` (`report_no`);--> statement-breakpoint
CREATE TABLE `service_reports` (
	`report_no` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`location_id` text NOT NULL,
	`client_name_snapshot` text NOT NULL,
	`address_snapshot` text NOT NULL,
	`service_date` text NOT NULL,
	`service_month` text NOT NULL,
	`service_type` text NOT NULL,
	`status` text NOT NULL,
	`condition` text NOT NULL,
	`summary` text NOT NULL,
	`work_performed_json` text NOT NULL,
	`equipment_json` text NOT NULL,
	`technician_ids_json` text NOT NULL,
	`technicians_json` text NOT NULL,
	`remarks` text DEFAULT '' NOT NULL,
	`follow_up` text DEFAULT '' NOT NULL,
	`acknowledgement_json` text NOT NULL,
	`source_document_json` text,
	`transcription_notes_json` text DEFAULT '[]' NOT NULL,
	`share_token_hash` text,
	`sent_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reports_share_token_idx` ON `service_reports` (`share_token_hash`);--> statement-breakpoint
CREATE TABLE `technicians` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`designation` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
