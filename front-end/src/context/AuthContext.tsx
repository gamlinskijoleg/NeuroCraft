import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { API_URLS } from "../constants/config";
import { clearSession, loadSession, saveSession } from "../utils/auth-storage";
import type { AuthSession, AuthUser } from "../types/auth";

type AuthContextValue = {
    session: AuthSession | null;
    user: AuthUser | null;
    isReady: boolean;
    isAuthenticated: boolean;
    login: (identifier: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthPayload = {
    identifier?: string;
    email?: string;
    password: string;
};

function translateAuthErrorMessage(message: string): string {
    const normalized = message.trim();

    switch (normalized) {
        case "value is not a valid email address":
            return "Введіть коректну адресу електронної пошти";
        case "String should have at least 8 characters":
            return "Пароль має містити щонайменше 8 символів";
        case "String should have at most 128 characters":
            return "Рядок має містити не більше 128 символів";
        case "Field required":
            return "Поле є обов'язковим";
        case "Input should be a valid string":
            return "Потрібно ввести текст";
        default:
            return message;
    }
}

async function parseResponseBody(response: Response): Promise<unknown> {
    const rawBody = await response.text();

    if (!rawBody) {
        return null;
    }

    try {
        return JSON.parse(rawBody) as unknown;
    } catch {
        return rawBody;
    }
}

async function requestAuth(url: string, payload: AuthPayload): Promise<AuthSession> {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    const data = (await parseResponseBody(response)) as
        | AuthSession
        | { detail?: string | Array<{ msg: string }> }
        | string
        | null;

    if (
        !response.ok ||
        data === null ||
        typeof data !== "object" ||
        !("access_token" in data)
    ) {
        let message = "Запит не виконано";

        if (typeof data === "string") {
            message = translateAuthErrorMessage(data);
        } else if (data && typeof data === "object" && "detail" in data) {
            const detail = (data as any).detail;
            if (typeof detail === "string") {
                message = translateAuthErrorMessage(detail);
            } else if (Array.isArray(detail) && detail.length > 0) {
                // Handle Pydantic validation errors
                const errorMessages = detail
                    .map((err: any) =>
                        translateAuthErrorMessage(err.msg || JSON.stringify(err)),
                    )
                    .join("; ");
                message = errorMessages;
            }
        }

        throw new Error(message);
    }

    return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<AuthSession | null>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        let active = true;

        loadSession()
            .then((storedSession) => {
                if (active) {
                    setSession(storedSession);
                }
            })
            .finally(() => {
                if (active) {
                    setIsReady(true);
                }
            });

        return () => {
            active = false;
        };
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({
            session,
            user: session?.user ?? null,
            isReady,
            isAuthenticated: Boolean(session?.access_token),
            login: async (identifier, password) => {
                const nextSession = await requestAuth(API_URLS.AUTH_LOGIN, {
                    identifier,
                    password,
                });
                await saveSession(nextSession);
                setSession(nextSession);
            },
            register: async (email, password) => {
                const nextSession = await requestAuth(API_URLS.AUTH_REGISTER, {
                    email,
                    password,
                });
                await saveSession(nextSession);
                setSession(nextSession);
            },
            logout: async () => {
                await clearSession();
                setSession(null);
            },
        }),
        [isReady, session],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth має використовуватися всередині AuthProvider");
    }
    return context;
}
