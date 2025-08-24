import {LoginResponse, User} from "../types.ts";
import {setAuthToken} from "../utilites/apiClient.ts";

// Simple localStorage-based auth management
const AUTH_TOKEN_KEY = 'hi-events-auth-token';
const AUTH_USER_KEY = 'hi-events-auth-user';

interface AuthStore {
    token: string | null
    user: User | null
    isAuthenticated: boolean
    
    // Actions
    setAuth: (authData: LoginResponse) => void
    clearAuth: () => void
    updateUser: (user: User) => void
    initialize: () => void
}

// Helper functions for localStorage
const getStoredToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(AUTH_TOKEN_KEY);
};

const getStoredUser = (): User | null => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem(AUTH_USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
};

const setStoredToken = (token: string | null) => {
    if (typeof window === 'undefined') return;
    if (token) {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
        localStorage.removeItem(AUTH_TOKEN_KEY);
    }
};

const setStoredUser = (user: User | null) => {
    if (typeof window === 'undefined') return;
    if (user) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } else {
        localStorage.removeItem(AUTH_USER_KEY);
    }
};

// Create a simple store without external dependencies
let authStore: AuthStore = {
    token: null,
    user: null,
    isAuthenticated: false,

    setAuth: (authData: LoginResponse) => {
        const { token, user } = authData;
        
        // Store in localStorage
        setStoredToken(token || null);
        setStoredUser(user);
        
        // Set the token in axios headers
        setAuthToken(token || null);
        
        // Update store
        authStore.token = token || null;
        authStore.user = user;
        authStore.isAuthenticated = !!token;
    },

    clearAuth: () => {
        // Clear from localStorage
        setStoredToken(null);
        setStoredUser(null);
        
        // Clear the token from axios headers
        setAuthToken(null);
        
        // Update store
        authStore.token = null;
        authStore.user = null;
        authStore.isAuthenticated = false;
    },

    updateUser: (user: User) => {
        setStoredUser(user);
        authStore.user = user;
    },

    initialize: () => {
        // Initialize from localStorage
        const storedToken = getStoredToken();
        const storedUser = getStoredUser();
        
        if (storedToken && storedUser) {
            setAuthToken(storedToken);
            authStore.token = storedToken;
            authStore.user = storedUser;
            authStore.isAuthenticated = true;
        }
    }
};

export const useAuthStore = () => authStore;
