import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../src/context/AuthContext";

export default function LoginScreen() {
    const router = useRouter();
    const { login, isAuthenticated, isReady } = useAuth();
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        if (isReady && isAuthenticated) {
            router.replace("/");
        }
    }, [isAuthenticated, isReady, router]);

    const handleSubmit = async () => {
        if (!identifier.trim() || !password.trim()) {
            setErrorMessage("Enter your email/username and password.");
            return;
        }

        setErrorMessage("");
        setIsSubmitting(true);
        try {
            await login(identifier.trim(), password);
            router.replace("/");
        } catch (error) {
            let errorMsg = "Login failed";

            // Unwrap if error is wrapped
            const actualError = (error as any)?.error || error;

            // Log the full error structure for debugging
            const errObj = actualError as any;
            const descriptors = Object.getOwnPropertyDescriptors(actualError || {});

            console.error("Full error object:", {
                isError: actualError instanceof Error,
                type: typeof actualError,
                message: errObj.message,
                stack: errObj.stack,
                descriptors: descriptors,
                status: errObj.status,
                statusCode: errObj.statusCode,
                response: errObj.response,
                data: errObj.data,
                error: actualError,
            });

            // Try to get error message from various possible sources
            if (errObj.response?.data?.message) {
                errorMsg = errObj.response.data.message;
            } else if (errObj.response?.data?.error) {
                errorMsg = errObj.response.data.error;
            } else if (errObj.response?.data) {
                if (typeof errObj.response.data === "string") {
                    errorMsg = errObj.response.data;
                } else {
                    errorMsg = JSON.stringify(errObj.response.data);
                }
            } else if (errObj.data?.message) {
                errorMsg = errObj.data.message;
            } else if (typeof errObj.data === "string") {
                errorMsg = errObj.data;
            } else if (errObj.message && typeof errObj.message === "string" && errObj.message !== "[object Object]") {
                errorMsg = errObj.message;
            }

            // Avoid showing [object Object]
            if (errorMsg === "[object Object]" || !errorMsg) {
                errorMsg = "An error occurred during login";
            }

            setErrorMessage(errorMsg);
            console.error("Login error:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsSubmitting(true);
        try {
            // TODO: Implement Google sign-in
            console.log("Google sign-in not yet implemented");
        } catch (error) {
            setErrorMessage("Google sign-in failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAppleSignIn = async () => {
        setIsSubmitting(true);
        try {
            // TODO: Implement Apple sign-in
            console.log("Apple sign-in not yet implemented");
        } catch (error) {
            setErrorMessage("Apple sign-in failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.screen}>
            <StatusBar barStyle="light-content" />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.flex}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.hero}>
                        <Text style={styles.heroTitle}>EasyRoad</Text>
                        <Text style={styles.heroSubtitle}>
                            Your reliable assistant, following the road with you.
                        </Text>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            autoCapitalize="none"
                            autoComplete="email"
                            autoCorrect={false}
                            keyboardType="email-address"
                            placeholder="Email"
                            placeholderTextColor="rgba(255,255,255,0.35)"
                            style={styles.input}
                            value={identifier}
                            onChangeText={setIdentifier}
                            editable={!isSubmitting}
                        />

                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            autoCapitalize="none"
                            autoComplete="password"
                            autoCorrect={false}
                            placeholder="Password"
                            placeholderTextColor="rgba(255,255,255,0.35)"
                            secureTextEntry
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            editable={!isSubmitting}
                        />

                        {errorMessage ? (
                            <Text style={styles.error}>{errorMessage}</Text>
                        ) : null}

                        <Pressable
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                            style={({ pressed }) => [
                                styles.primaryButton,
                                pressed && !isSubmitting && styles.pressed,
                                isSubmitting && styles.disabled,
                            ]}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#0B0F1A" />
                            ) : (
                                <Text style={styles.primaryButtonText}>Sign In</Text>
                            )}
                        </Pressable>

                        <Text style={styles.orText}>Or sign in with</Text>

                        <View style={styles.socialButtonsContainer}>
                            <Pressable
                                onPress={handleGoogleSignIn}
                                disabled={isSubmitting}
                                style={({ pressed }) => [
                                    styles.socialButton,
                                    pressed && !isSubmitting && styles.pressed,
                                    isSubmitting && styles.disabledSocial,
                                ]}
                            >
                                <Ionicons name="logo-google" size={24} color="#F4F7FB" />
                            </Pressable>

                            <Pressable
                                onPress={handleAppleSignIn}
                                disabled={isSubmitting}
                                style={({ pressed }) => [
                                    styles.socialButton,
                                    pressed && !isSubmitting && styles.pressed,
                                    isSubmitting && styles.disabledSocial,
                                ]}
                            >
                                <Ionicons name="logo-apple" size={24} color="#F4F7FB" />
                            </Pressable>
                        </View>

                        <Pressable onPress={() => router.push("/register")}>
                            <Text style={styles.link}>
                                Don't have account?{" "}
                                <Text style={styles.linkBold}>Create an account</Text>
                            </Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    screen: {
        flex: 1,
        backgroundColor: "#0B0F1A",
    },
    scroll: {
        flexGrow: 1,
        justifyContent: "center",
        paddingHorizontal: 20,
        paddingVertical: 28,
    },
    hero: {
        marginBottom: 40,
    },
    heroTitle: {
        color: "#F4F7FB",
        fontSize: 48,
        fontWeight: "800",
        marginBottom: 12,
    },
    heroSubtitle: {
        color: "rgba(244,247,251,0.74)",
        fontSize: 16,
        lineHeight: 22,
    },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: 8,
        backgroundColor: "#F4C95D",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        marginBottom: 18,
    },
    badgeText: {
        color: "#0B0F1A",
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.3,
    },
    title: {
        color: "#F4F7FB",
        fontSize: 40,
        fontWeight: "800",
        lineHeight: 44,
        marginBottom: 10,
    },
    subtitle: {
        color: "rgba(244,247,251,0.74)",
        fontSize: 15,
        lineHeight: 22,
    },
    card: {
        backgroundColor: "rgba(255,255,255,0.07)",
        borderColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        borderRadius: 28,
        padding: 20,
        gap: 12,
    },
    label: {
        color: "#F4F7FB",
        fontSize: 13,
        fontWeight: "700",
    },
    input: {
        backgroundColor: "rgba(7,11,21,0.72)",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        color: "#F4F7FB",
        paddingHorizontal: 16,
        paddingVertical: 15,
        fontSize: 16,
    },
    primaryButton: {
        backgroundColor: "#001F3F",
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 52,
        marginTop: 6,
    },
    primaryButtonText: {
        color: "#F4F7FB",
        fontSize: 16,
        fontWeight: "800",
    },
    error: {
        color: "#FFB4B4",
        fontSize: 13,
        lineHeight: 18,
    },
    orText: {
        color: "rgba(244,247,251,0.5)",
        fontSize: 14,
        textAlign: "center",
        marginVertical: 12,
    },
    socialButtonsContainer: {
        flexDirection: "row",
        gap: 12,
        justifyContent: "center",
        marginBottom: 8,
    },
    socialButton: {
        backgroundColor: "rgba(255,255,255,0.07)",
        borderColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        borderRadius: 18,
        width: 50,
        height: 50,
        alignItems: "center",
        justifyContent: "center",
    },
    disabledSocial: {
        opacity: 0.5,
    },
    disabled: {
        opacity: 0.6,
    },
    link: {
        color: "rgba(244,247,251,0.74)",
        fontSize: 14,
        fontWeight: "500",
        textAlign: "center",
        marginTop: 12,
    },
    linkBold: {
        color: "#D6E4FF",
        fontWeight: "700",
    },
    pressed: {
        opacity: 0.85,
        transform: [{ scale: 0.99 }],
    },
});
