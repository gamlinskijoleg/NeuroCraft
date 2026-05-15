import { Platform } from "react-native";

/**
 * Centralized API configuration
 * Supports environment variable override via EXPO_PUBLIC_API_URL
 */
export const getApiBaseUrl = (): string => {
    const env = process.env.EXPO_PUBLIC_API_URL;

    // Use environment variable if set
    if (env !== undefined && env !== "") {
        return env.replace(/\/$/, ""); // Remove trailing slash
    }

    // Production builds require environment variable
    if (!__DEV__) {
        return "";
    }

    // Development defaults based on platform
    if (Platform.OS === "android") {
        return "http://10.0.2.2:8000"; // Android emulator
    }

    return "http://localhost:8000"; // iOS simulator & web
};

export const API_BASE = getApiBaseUrl();

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
    HEALTH: "/health",
    DETECT_CRACKS: "/detect/cracks",
    CLASSIFY_SIGNS: "/classify/signs",
    PROCESS_ALL: "/process/all",
} as const;

/**
 * Full API URLs
 */
export const API_URLS = {
    HEALTH: `${API_BASE}${API_ENDPOINTS.HEALTH}`,
    DETECT_CRACKS: `${API_BASE}${API_ENDPOINTS.DETECT_CRACKS}`,
    CLASSIFY_SIGNS: `${API_BASE}${API_ENDPOINTS.CLASSIFY_SIGNS}`,
    PROCESS_ALL: `${API_BASE}${API_ENDPOINTS.PROCESS_ALL}`,
} as const;

export default {};
