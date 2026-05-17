import { Platform } from "react-native";

export const getApiBaseUrl = (): string => {
    const env = process.env.EXPO_PUBLIC_API_URL;

    if (env !== undefined && env !== "") {
        return env.replace(/\/$/, "");
    }

    if (!__DEV__) {
        return "";
    }

    if (Platform.OS === "android") {
        return "http://10.0.2.2:8000";
    }

    return "http://localhost:8000";
};

export const API_BASE = getApiBaseUrl();

export const API_ENDPOINTS = {
    HEALTH: "/health",
    AUTH_REGISTER: "/auth/register",
    AUTH_LOGIN: "/auth/login",
    AUTH_ME: "/auth/me",
    GOALS: "/goals",
    DETECT_CRACKS: "/detect/cracks",
    CLASSIFY_SIGNS: "/classify/signs",
    PROCESS_ALL: "/process/all",
} as const;

export const API_URLS = {
    HEALTH: `${API_BASE}${API_ENDPOINTS.HEALTH}`,
    AUTH_REGISTER: `${API_BASE}${API_ENDPOINTS.AUTH_REGISTER}`,
    AUTH_LOGIN: `${API_BASE}${API_ENDPOINTS.AUTH_LOGIN}`,
    AUTH_ME: `${API_BASE}${API_ENDPOINTS.AUTH_ME}`,
    GOALS: `${API_BASE}${API_ENDPOINTS.GOALS}`,
    DETECT_CRACKS: `${API_BASE}${API_ENDPOINTS.DETECT_CRACKS}`,
    CLASSIFY_SIGNS: `${API_BASE}${API_ENDPOINTS.CLASSIFY_SIGNS}`,
    PROCESS_ALL: `${API_BASE}${API_ENDPOINTS.PROCESS_ALL}`,
} as const;
