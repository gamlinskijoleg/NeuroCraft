import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Image,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

const API_BASE = (() => {
    const env = process.env.EXPO_PUBLIC_API_URL;
    if (env !== undefined && env !== "") {
        return env.replace(/\/$/, "");
    }
    if (!__DEV__) {
        return "";
    }
    return Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000";
})();

type ApiDetection = {
    class_name?: string;
    confidence: number;
};
type ApiSingleResponse = {
    success: boolean;
    message: string;
    detections?: ApiDetection[];
    model_used?: string;
    processing_time?: number;
};

export default function TrafficSignsScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [modelUsed, setModelUsed] = useState<string | null>(null);
    const [rows, setRows] = useState<Array<{ class_name: string; confidence: number }>>([]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const pickImage = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            setError("Необхідний дозвіл на доступ до фотогалереї");
            return;
        }
        const picked = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: false,
            quality: 0.8,
        });
        if (picked.canceled || picked.assets.length === 0) {
            return;
        }
        const asset = picked.assets[0]!;
        setSelectedImage(asset.uri);
        setError(null);
    };

    const performScan = async () => {
        if (!selectedImage) {
            setError("Спочатку виберіть зображення");
            return;
        }

        setError(null);
        setMessage(null);
        setModelUsed(null);
        setRows([]);

        if (API_BASE.length === 0) {
            setError("Встановіть EXPO_PUBLIC_API_URL для релізних збірок");
            return;
        }

        setLoading(true);
        try {
            const form = new FormData();
            form.append("file", {
                uri: selectedImage,
                name: "upload.jpg",
                type: "image/jpeg",
            } as unknown as Blob);

            const endpoint = "/classify/signs";
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: "POST",
                body: form,
            });
            const text = await res.text();
            const data = JSON.parse(text) as ApiSingleResponse;

            if (!res.ok || !data.success) {
                throw new Error(data.message || `Request failed (${res.status})`);
            }
            const parsedRows: Array<{ class_name: string; confidence: number }> = (
                data.detections ?? []
            ).map((d) => ({
                class_name: d.class_name ?? "Sign",
                confidence: d.confidence,
            }));
            parsedRows.sort((a, b) => b.confidence - a.confidence);
            setRows(parsedRows);
            setMessage(data.message);
            setModelUsed(data.model_used ?? null);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            setError(msg);
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.screen}>
            <StatusBar barStyle="dark-content" />
            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
            >
                {/* Header */}
                <View style={styles.headerContainer}>
                    <Pressable
                        onPress={() => router.back()}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color="#1A2343" />
                    </Pressable>
                    <Text style={styles.brand}>Дорожні знаки</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.descriptionBox}>
                    <Ionicons name="information-circle" size={20} color="#1A2241" />
                    <Text style={styles.description}>
                        Розпізнавання та класифікація дорожніх знаків
                    </Text>
                </View>

                {/* Image Preview */}
                {selectedImage && (
                    <View style={styles.imagePreviewContainer}>
                        <Image
                            source={{ uri: selectedImage }}
                            style={styles.imagePreview}
                        />
                        <Pressable
                            style={styles.removeImageButton}
                            onPress={() => setSelectedImage(null)}
                        >
                            <Ionicons name="close-circle" size={24} color="#fff" />
                        </Pressable>
                    </View>
                )}

                {/* Upload Button */}
                <Pressable
                    style={styles.uploadBtn}
                    onPress={pickImage}
                >
                    <Ionicons name="cloud-upload" size={20} color="#1A2241" />
                    <Text style={styles.uploadBtnText}>
                        {selectedImage ? "Змінити зображення" : "Завантажити зображення"}
                    </Text>
                </Pressable>

                {/* Start Scan Button */}
                <Pressable
                    style={[
                        styles.scanBtn,
                        !selectedImage || loading ? styles.scanBtnDisabled : null,
                    ]}
                    onPress={performScan}
                    disabled={!selectedImage || loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <>
                            <Ionicons name="scan" size={20} color="#fff" />
                            <Text style={styles.scanBtnText}>Почати сканування</Text>
                        </>
                    )}
                </Pressable>

                {/* Error Message */}
                {error != null ? (
                    <View style={styles.errorBox}>
                        <Ionicons name="alert-circle" size={16} color="#A23F3F" />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                {/* Results Section */}
                {message != null && (
                    <View style={styles.recentWrap}>
                        <Text style={styles.recentTitle}>Результати сканування</Text>
                        <View style={styles.resultCard}>
                            <Text style={styles.resultTitle}>{message}</Text>
                            <Text style={styles.resultMeta}>
                                Дорожні знаки • {rows.length} виявлень
                            </Text>
                            {modelUsed != null ? (
                                <Text style={styles.resultMeta}>
                                    Модель: {modelUsed}
                                </Text>
                            ) : null}
                            <View style={styles.detectionsList}>
                                {rows.map((row, i) => (
                                    <View key={`${row.class_name}-${i}`} style={styles.detectionItem}>
                                        <Text style={styles.detectionName}>
                                            {row.class_name}
                                        </Text>
                                        <View style={styles.confidenceBar}>
                                            <View
                                                style={[
                                                    styles.confidenceBarFill,
                                                    {
                                                        width: `${row.confidence * 100}%`,
                                                    },
                                                ]}
                                            />
                                        </View>
                                        <Text style={styles.confidenceText}>
                                            {(row.confidence * 100).toFixed(1)}%
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#F5F5F7" },
    scroll: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 18 },
    headerContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
    },
    brand: { color: "#222643", fontSize: 18, fontWeight: "700" },
    descriptionBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E3F2FD",
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
        gap: 10,
    },
    description: {
        color: "#1A2241",
        fontSize: 13,
        fontWeight: "500",
        flex: 1,
    },

    /* Image Preview */
    imagePreviewContainer: {
        marginTop: 16,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E5E7F0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
        marginBottom: 16,
    },
    imagePreview: {
        width: "100%",
        height: 200,
        backgroundColor: "#F5F5F7",
    },
    removeImageButton: {
        position: "absolute",
        top: 8,
        right: 8,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        borderRadius: 20,
        padding: 4,
    },

    /* Upload Button */
    uploadBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 10,
        borderWidth: 2,
        borderColor: "#1A2241",
        paddingVertical: 12,
        gap: 8,
        marginBottom: 10,
    },
    uploadBtnText: { color: "#1A2241", fontSize: 14, fontWeight: "600" },

    /* Scan Button */
    scanBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#1E90FF",
        borderRadius: 10,
        paddingVertical: 12,
        gap: 8,
        marginBottom: 12,
    },
    scanBtnDisabled: { opacity: 0.5 },
    scanBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },

    /* Error Box */
    errorBox: {
        marginTop: 12,
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: "#F4B7B7",
        backgroundColor: "#FFEDED",
        flexDirection: "row",
        gap: 10,
        alignItems: "flex-start",
        marginBottom: 12,
    },
    errorText: { color: "#A23F3F", fontSize: 12, lineHeight: 16, flex: 1 },

    /* Results Section */
    recentWrap: { marginTop: 20, marginBottom: 20 },
    recentTitle: { color: "#4B526D", fontSize: 12, fontWeight: "700", marginBottom: 10 },
    resultCard: {
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: "#DEE3F1",
        backgroundColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    resultTitle: { color: "#20284B", fontSize: 13, fontWeight: "700" },
    resultMeta: { marginTop: 6, color: "#697299", fontSize: 11 },

    /* Detections List */
    detectionsList: {
        marginTop: 12,
        gap: 10,
    },
    detectionItem: {
        gap: 6,
    },
    detectionName: {
        color: "#1A2343",
        fontSize: 11,
        fontWeight: "600",
    },
    confidenceBar: {
        height: 6,
        backgroundColor: "#E5E7F0",
        borderRadius: 3,
        overflow: "hidden",
    },
    confidenceBarFill: {
        height: "100%",
        backgroundColor: "#1E90FF",
        borderRadius: 3,
    },
    confidenceText: {
        color: "#697299",
        fontSize: 10,
        fontWeight: "500",
    },
});
