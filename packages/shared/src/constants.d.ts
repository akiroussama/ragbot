export declare const CHATBOT_EVENTS: {
    readonly MESSAGE_SENT: "message:sent";
    readonly MESSAGE_RECEIVED: "message:received";
    readonly TYPING_START: "typing:start";
    readonly TYPING_STOP: "typing:stop";
    readonly ERROR: "error";
    readonly CONNECTED: "connected";
    readonly DISCONNECTED: "disconnected";
};
export declare const JOB_TYPES: {
    readonly WEBSITE_CRAWL: "website_crawl";
    readonly DOCUMENT_PROCESS: "document_process";
    readonly EMBEDDING_GENERATE: "embedding_generate";
    readonly SOURCE_SYNC: "source_sync";
};
export declare const SUBSCRIPTION_TIERS: {
    readonly FREE: "free";
    readonly STARTER: "starter";
    readonly PRO: "pro";
    readonly ENTERPRISE: "enterprise";
};
export declare const RATE_LIMITS: {
    readonly free: {
        readonly messagesPerDay: 100;
        readonly projectsPerOrg: 1;
        readonly sourcesPerProject: 5;
        readonly documentsPerSource: 50;
    };
    readonly starter: {
        readonly messagesPerDay: 1000;
        readonly projectsPerOrg: 3;
        readonly sourcesPerProject: 20;
        readonly documentsPerSource: 200;
    };
    readonly pro: {
        readonly messagesPerDay: 10000;
        readonly projectsPerOrg: 10;
        readonly sourcesPerProject: 100;
        readonly documentsPerSource: 1000;
    };
    readonly enterprise: {
        readonly messagesPerDay: -1;
        readonly projectsPerOrg: -1;
        readonly sourcesPerProject: -1;
        readonly documentsPerSource: -1;
    };
};
export declare const DEFAULT_WIDGET_SETTINGS: {
    readonly theme: "light";
    readonly position: "bottom-right";
    readonly primaryColor: "#3B82F6";
    readonly borderRadius: "12px";
    readonly width: "380px";
    readonly height: "600px";
    readonly greetingMessage: "Hello! How can I help you today?";
    readonly placeholder: "Type your message...";
    readonly showBranding: true;
    readonly allowFileUpload: false;
    readonly enableSounds: true;
    readonly persistConversation: true;
    readonly language: "en";
};
//# sourceMappingURL=constants.d.ts.map