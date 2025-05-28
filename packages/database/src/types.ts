import { z } from 'zod';

export const UserRoleSchema = z.enum(['admin', 'user', 'viewer']);
export const AuthProviderSchema = z.enum(['local', 'google', 'github']);
export const MessageRoleSchema = z.enum(['user', 'assistant', 'system']);
export const SourceTypeSchema = z.enum(['website', 'document', 'integration']);
export const JobStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);

export type UserRole = z.infer<typeof UserRoleSchema>;
export type AuthProvider = z.infer<typeof AuthProviderSchema>;
export type MessageRole = z.infer<typeof MessageRoleSchema>;
export type SourceType = z.infer<typeof SourceTypeSchema>;
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const CreateUserSchema = z.object({
  email: z.string().email(),
  username: z.string().optional(),
  password: z.string().min(8).optional(),
  role: UserRoleSchema.default('user'),
  provider: AuthProviderSchema.default('local'),
  providerId: z.string().optional(),
});

export const CreateOrganizationSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  ownerId: z.string().uuid(),
});

export const CreateProjectSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  settings: z.record(z.any()).default({}),
  widgetSettings: z.record(z.any()).default({}),
});

export const CreateSourceSchema = z.object({
  projectId: z.string().uuid(),
  type: SourceTypeSchema,
  name: z.string().min(1),
  config: z.record(z.any()).default({}),
  metadata: z.record(z.any()).default({}),
});

export const CreateDocumentSchema = z.object({
  sourceId: z.string().uuid(),
  title: z.string().min(1),
  content: z.string().optional(),
  url: z.string().url().optional(),
  metadata: z.record(z.any()).default({}),
});

export const CreateConversationSchema = z.object({
  projectId: z.string().uuid(),
  sessionId: z.string().min(1),
  userIdentifier: z.string().optional(),
  metadata: z.record(z.any()).default({}),
});

export const CreateMessageSchema = z.object({
  conversationId: z.string().uuid(),
  role: MessageRoleSchema,
  content: z.string().min(1),
  metadata: z.record(z.any()).default({}),
  tokensUsed: z.number().optional(),
});

export const CreateJobSchema = z.object({
  projectId: z.string().uuid(),
  type: z.string().min(1),
  config: z.record(z.any()).default({}),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type CreateSourceInput = z.infer<typeof CreateSourceSchema>;
export type CreateDocumentInput = z.infer<typeof CreateDocumentSchema>;
export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;
export type CreateMessageInput = z.infer<typeof CreateMessageSchema>;
export type CreateJobInput = z.infer<typeof CreateJobSchema>;