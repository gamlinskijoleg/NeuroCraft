import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AuthSession } from "../types/auth";

const SESSION_KEY = "neurocraft.auth.session";

export async function saveSession(session: AuthSession): Promise<void> {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function loadSession(): Promise<AuthSession | null> {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw) as AuthSession;
    } catch {
        await AsyncStorage.removeItem(SESSION_KEY);
        return null;
    }
}

export async function clearSession(): Promise<void> {
    await AsyncStorage.removeItem(SESSION_KEY);
}
