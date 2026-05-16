import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../src/context/AuthContext";

export default function UserTabScreen() {
    const router = useRouter();
    const { user, isAuthenticated, isReady, logout } = useAuth();

    if (!isReady) {
        return (
            <SafeAreaView style={styles.screen}>
                <View style={styles.loaderWrap}>
                    <ActivityIndicator size="large" color="#1E90FF" />
                </View>
            </SafeAreaView>
        );
    }

    if (!isAuthenticated || !user) {
        return (
            <SafeAreaView style={styles.screen}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.authCard}>
                    <View style={styles.authIcon}>
                        <Ionicons name="person-circle-outline" size={44} color="#1a1a2e" />
                    </View>
                    <Text style={styles.authTitle}>Account required</Text>
                    <Text style={styles.authText}>
                        Sign in or create an account to keep your session on this device.
                    </Text>
                    <Pressable
                        onPress={() => router.push("/login")}
                        style={({ pressed }) => [styles.authButton, pressed && styles.pressed]}
                    >
                        <Text style={styles.authButtonText}>Sign in</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => router.push("/register")}
                        style={({ pressed }) => [styles.authGhostButton, pressed && styles.pressed]}
                    >
                        <Text style={styles.authGhostButtonText}>Create account</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.screen}>
            <StatusBar barStyle="dark-content" />
            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
            >
                <View style={styles.content}>
                    <View style={styles.profileCard}>
                        <View style={styles.avatar}>
                            <Ionicons name="person" size={34} color="#F4F7FB" />
                        </View>
                        <Text style={styles.profileName}>{user.username}</Text>
                        <Text style={styles.profileEmail}>{user.email}</Text>
                        <Text style={styles.profileMeta}>
                            Session stored locally on this device.
                        </Text>
                        <Pressable
                            onPress={async () => {
                                await logout();
                                router.replace("/login");
                            }}
                            style={({ pressed }) => [
                                styles.logoutButton,
                                pressed && styles.pressed,
                            ]}
                        >
                            <Text style={styles.logoutButtonText}>Log out</Text>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#F5F5F7",
    },
    scroll: {
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 18,
    },
    content: {
        flex: 1,
    },
    loaderWrap: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    authCard: {
        flex: 1,
        marginTop: 20,
        backgroundColor: "#0B0F1A",
        borderRadius: 28,
        padding: 24,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
    },
    authIcon: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: "#E8F1FF",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    authTitle: {
        color: "#F4F7FB",
        fontSize: 28,
        fontWeight: "800",
        textAlign: "center",
    },
    authText: {
        color: "rgba(244,247,251,0.72)",
        textAlign: "center",
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 8,
    },
    authButton: {
        width: "100%",
        backgroundColor: "#1E90FF",
        borderRadius: 18,
        minHeight: 52,
        alignItems: "center",
        justifyContent: "center",
    },
    authButtonText: {
        color: "#F4F7FB",
        fontSize: 16,
        fontWeight: "800",
    },
    authGhostButton: {
        width: "100%",
        borderRadius: 18,
        minHeight: 52,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(244,247,251,0.12)",
    },
    authGhostButtonText: {
        color: "#F4F7FB",
        fontSize: 16,
        fontWeight: "700",
    },
    profileCard: {
        marginTop: 20,
        backgroundColor: "#0B0F1A",
        borderRadius: 28,
        padding: 24,
        alignItems: "center",
        gap: 10,
    },
    avatar: {
        width: 92,
        height: 92,
        borderRadius: 46,
        backgroundColor: "#1E90FF",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    profileName: {
        color: "#F4F7FB",
        fontSize: 26,
        fontWeight: "800",
    },
    profileEmail: {
        color: "rgba(244,247,251,0.72)",
        fontSize: 15,
    },
    profileMeta: {
        color: "rgba(244,247,251,0.55)",
        fontSize: 13,
        textAlign: "center",
        lineHeight: 18,
        marginTop: 6,
    },
    logoutButton: {
        width: "100%",
        marginTop: 12,
        backgroundColor: "#F4C95D",
        borderRadius: 18,
        minHeight: 52,
        alignItems: "center",
        justifyContent: "center",
    },
    logoutButtonText: {
        color: "#0B0F1A",
        fontSize: 16,
        fontWeight: "800",
    },
    pressed: {
        opacity: 0.85,
        transform: [{ scale: 0.99 }],
    },
});
