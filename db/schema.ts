import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
export const documents = sqliteTable('documents', {
 id:text('id').primaryKey(), owner:text('owner').notNull(), assignedMentor:text('assigned_mentor'),
 kind:text('kind').notNull(), sourceId:text('source_id').notNull(), text:text('text').notNull(),
 status:text('status').notNull(), revision:integer('revision').notNull(), comment:text('comment').notNull().default(''),
 mutationId:text('mutation_id').notNull(), createdAt:text('created_at').notNull(), updatedAt:text('updated_at').notNull()
},t=>[uniqueIndex('documents_owner_source').on(t.owner,t.sourceId), index('documents_mentor_status').on(t.assignedMentor,t.status)]);
export const documentVersions=sqliteTable('document_versions',{
 id:text('id').primaryKey(),documentId:text('document_id').notNull().references(()=>documents.id),
 revision:integer('revision').notNull(),text:text('text').notNull(),status:text('status').notNull(),
 comment:text('comment').notNull(),actor:text('actor').notNull(),createdAt:text('created_at').notNull()
},t=>[uniqueIndex('document_versions_document_revision').on(t.documentId,t.revision)]);
export const assignments=sqliteTable('assignments',{
 student:text('student').primaryKey(),mentor:text('mentor').notNull(),assignedBy:text('assigned_by').notNull(),updatedAt:text('updated_at').notNull()
},t=>[index('assignments_mentor').on(t.mentor)]);
export const notifications=sqliteTable('notifications',{
 id:text('id').primaryKey(),recipient:text('recipient').notNull(),type:text('type').notNull(),title:text('title').notNull(),
 documentId:text('document_id'),requestId:text('request_id'),readAt:text('read_at'),createdAt:text('created_at').notNull()
},t=>[index('notifications_recipient_created').on(t.recipient,t.createdAt)]);
export const patientRequests=sqliteTable('patient_requests',{
 id:text('id').primaryKey(),clientRequestId:text('client_request_id').notNull(),trackingHash:text('tracking_hash').notNull(),
 type:text('type').notNull(),body:text('body').notNull(),assignedDoctor:text('assigned_doctor').notNull(),
 status:text('status').notNull(),revision:integer('revision').notNull(),message:text('message').notNull().default(''),
 createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()
},t=>[uniqueIndex('patient_requests_client_id').on(t.clientRequestId),uniqueIndex('patient_requests_tracking').on(t.trackingHash),index('patient_requests_doctor_created').on(t.assignedDoctor,t.createdAt)]);
export const rateLimits=sqliteTable('rate_limits',{
 key:text('key').primaryKey(),count:integer('count').notNull(),resetAt:integer('reset_at').notNull()
},t=>[index('rate_limits_reset').on(t.resetAt)]);
