import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "../src/context/AuthContext";

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <AuthProvider>
                <Stack>
                    <Stack.Screen
                        name="(tabs)"
                        options={{
                            headerShown: false,
                        }}
                    />
                    <Stack.Screen
                        name="(auth)"
                        options={{
                            headerShown: false,
                        }}
                    />
                    <Stack.Screen
                        name="road"
                        options={{
                            headerShown: false,
                            presentation: "modal",
                        }}
                    />
                    <Stack.Screen
                        name="signs"
                        options={{
                            headerShown: false,
                            presentation: "modal",
                        }}
                    />
                </Stack>
            </AuthProvider>
        </SafeAreaProvider>
    );
}
