import axios, { AxiosRequestConfig } from "axios";
import {isSsr} from "../utilites/helpers.ts";
import {getConfig} from "../utilites/config.ts";
import {sessionManager} from "../utilites/sessionManager.ts";

export const publicApi = axios.create({
    withCredentials: true,
});

publicApi.interceptors.request.use((config: AxiosRequestConfig) => {
    const baseUrl = isSsr()
        ? getConfig('VITE_API_URL_SERVER')
        : getConfig('VITE_API_URL_CLIENT');

    config.baseURL = `${baseUrl}/public`;
    
    // Add session identifier if available (for public endpoints)
    if (!isSsr()) {
        const sessionIdentifier = sessionManager.getSessionIdentifier();
        if (sessionIdentifier && config.headers) {
            config.headers['X-Session-Identifier'] = sessionIdentifier;
        }
    }
    
    return config;
}, (error: any) => {
    return Promise.reject(error);
});

// Intercept responses to extract and store session identifiers
publicApi.interceptors.response.use((response: any) => {
    if (!isSsr() && response.data?.data?.session_identifier) {
        sessionManager.handleOrderResponse(response.data.data);
    }
    return response;
}, (error: any) => {
    return Promise.reject(error);
});

axios.defaults.withCredentials = true;
