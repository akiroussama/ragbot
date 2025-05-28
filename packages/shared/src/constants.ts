export const CHATBOT_EVENTS = {
  MESSAGE_SENT: 'message:sent',
  MESSAGE_RECEIVED: 'message:received',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  ERROR: 'error',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
} as const;

export const JOB_TYPES = {
  WEBSITE_CRAWL: 'website_crawl',
  DOCUMENT_PROCESS: 'document_process',
  EMBEDDING_GENERATE: 'embedding_generate',
  SOURCE_SYNC: 'source_sync',
} as const;

export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  STARTER: 'starter',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const;

export const RATE_LIMITS = {
  [SUBSCRIPTION_TIERS.FREE]: {
    messagesPerDay: 100,
    projectsPerOrg: 1,
    sourcesPerProject: 5,
    documentsPerSource: 50,
  },
  [SUBSCRIPTION_TIERS.STARTER]: {
    messagesPerDay: 1000,
    projectsPerOrg: 3,
    sourcesPerProject: 20,
    documentsPerSource: 200,
  },
  [SUBSCRIPTION_TIERS.PRO]: {
    messagesPerDay: 10000,
    projectsPerOrg: 10,
    sourcesPerProject: 100,
    documentsPerSource: 1000,
  },
  [SUBSCRIPTION_TIERS.ENTERPRISE]: {
    messagesPerDay: -1, // unlimited
    projectsPerOrg: -1,
    sourcesPerProject: -1,
    documentsPerSource: -1,
  },
} as const;

export const DEFAULT_WIDGET_SETTINGS = {
  theme: 'light',
  position: 'bottom-right',
  primaryColor: '#3B82F6',
  borderRadius: '12px',
  width: '380px',
  height: '600px',
  greetingMessage: 'Hello! How can I help you today?',
  placeholder: 'Type your message...',
  showBranding: true,
  allowFileUpload: false,
  enableSounds: true,
  persistConversation: true,
  language: 'en',
} as const;