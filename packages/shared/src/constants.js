"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_WIDGET_SETTINGS = exports.RATE_LIMITS = exports.SUBSCRIPTION_TIERS = exports.JOB_TYPES = exports.CHATBOT_EVENTS = void 0;
exports.CHATBOT_EVENTS = {
    MESSAGE_SENT: 'message:sent',
    MESSAGE_RECEIVED: 'message:received',
    TYPING_START: 'typing:start',
    TYPING_STOP: 'typing:stop',
    ERROR: 'error',
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
};
exports.JOB_TYPES = {
    WEBSITE_CRAWL: 'website_crawl',
    DOCUMENT_PROCESS: 'document_process',
    EMBEDDING_GENERATE: 'embedding_generate',
    SOURCE_SYNC: 'source_sync',
};
exports.SUBSCRIPTION_TIERS = {
    FREE: 'free',
    STARTER: 'starter',
    PRO: 'pro',
    ENTERPRISE: 'enterprise',
};
exports.RATE_LIMITS = {
    [exports.SUBSCRIPTION_TIERS.FREE]: {
        messagesPerDay: 100,
        projectsPerOrg: 1,
        sourcesPerProject: 5,
        documentsPerSource: 50,
    },
    [exports.SUBSCRIPTION_TIERS.STARTER]: {
        messagesPerDay: 1000,
        projectsPerOrg: 3,
        sourcesPerProject: 20,
        documentsPerSource: 200,
    },
    [exports.SUBSCRIPTION_TIERS.PRO]: {
        messagesPerDay: 10000,
        projectsPerOrg: 10,
        sourcesPerProject: 100,
        documentsPerSource: 1000,
    },
    [exports.SUBSCRIPTION_TIERS.ENTERPRISE]: {
        messagesPerDay: -1, // unlimited
        projectsPerOrg: -1,
        sourcesPerProject: -1,
        documentsPerSource: -1,
    },
};
exports.DEFAULT_WIDGET_SETTINGS = {
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
};
//# sourceMappingURL=constants.js.map