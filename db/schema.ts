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
export const documentMeta=sqliteTable('document_meta',{
 documentId:text('document_id').primaryKey().references(()=>documents.id),template:text('template').notNull().default(''),
 fields:text('fields').notNull().default('{}'),scores:text('scores').notNull().default('{}'),activeMs:integer('active_ms').notNull().default(0),
 openedAt:text('opened_at'),approvedAt:text('approved_at'),updatedAt:text('updated_at').notNull()
});
export const versionMeta=sqliteTable('version_meta',{
 documentId:text('document_id').notNull().references(()=>documents.id),revision:integer('revision').notNull(),
 fields:text('fields').notNull().default('{}'),scores:text('scores').notNull().default('{}'),activeMs:integer('active_ms').notNull().default(0)
},t=>[uniqueIndex('version_meta_document_revision').on(t.documentId,t.revision)]);
export const profiles=sqliteTable('profiles',{
 login:text('login').primaryKey(),name:text('name').notNull().default(''),title:text('title').notNull().default(''),
 specialty:text('specialty').notNull().default(''),bio:text('bio').notNull().default(''),photo:text('photo').notNull().default(''),updatedAt:text('updated_at').notNull()
});
export const userAccounts=sqliteTable('user_accounts',{
 login:text('login').primaryKey(),role:text('role').notNull(),name:text('name').notNull(),salt:text('salt').notNull(),hash:text('hash').notNull(),
 version:integer('version').notNull(),active:integer('active').notNull().default(1),createdBy:text('created_by').notNull(),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()
});
export const auditLog=sqliteTable('audit_log',{
 id:text('id').primaryKey(),actor:text('actor').notNull(),role:text('role').notNull(),action:text('action').notNull(),
 target:text('target').notNull().default(''),details:text('details').notNull().default(''),createdAt:text('created_at').notNull()
},t=>[index('audit_log_created').on(t.createdAt)]);
export const pilotLeads=sqliteTable('pilot_leads',{
 id:text('id').primaryKey(),name:text('name').notNull(),organization:text('organization').notNull(),role:text('role').notNull(),
 contact:text('contact').notNull(),city:text('city').notNull().default(''),message:text('message').notNull().default(''),
 status:text('status').notNull().default('new'),createdAt:text('created_at').notNull()
},t=>[index('pilot_leads_created').on(t.createdAt)]);
