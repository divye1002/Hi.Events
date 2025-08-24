/**
 * Session Manager for handling session identifiers in public order flows
 */

const SESSION_IDENTIFIER_KEY = 'hi_events_session_identifier';

export const sessionManager = {
    /**
     * Get the current session identifier from various sources
     */
    getSessionIdentifier(): string | null {
        // First check URL params (highest priority)
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            const urlSessionId = url.searchParams.get('session_identifier');
            if (urlSessionId) {
                // Store it for future use
                this.storeSessionIdentifier(urlSessionId);
                return urlSessionId;
            }
        }

        // Then check localStorage
        if (typeof window !== 'undefined' && window.localStorage) {
            const stored = localStorage.getItem(SESSION_IDENTIFIER_KEY);
            if (stored) {
                return stored;
            }
        }

        return null;
    },

    /**
     * Store session identifier for future use
     */
    storeSessionIdentifier(sessionId: string): void {
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(SESSION_IDENTIFIER_KEY, sessionId);
        }
    },

    /**
     * Clear stored session identifier
     */
    clearSessionIdentifier(): void {
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.removeItem(SESSION_IDENTIFIER_KEY);
        }
    },

    /**
     * Extract session identifier from order response and store it
     */
    handleOrderResponse(order: any): void {
        if (order?.session_identifier) {
            this.storeSessionIdentifier(order.session_identifier);
        }
    }
};
