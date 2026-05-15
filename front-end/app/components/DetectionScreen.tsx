import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE } from "../constants/config";

const BACKEND_MAX_DIMENSION = 1024;
const MIN_DRAW_CONFIDENCE = 0.5;

type ApiDetection = {
    class_name?: string;
    confidence: number;
    bbox?:
        | number[]
        | { x: number; y: number; w: number; h: number }
        | { x1: number; y1: number; x2: number; y2: number };
};

type ApiSingleResponse = {
    success: boolean;
    message: string;
    detections?: ApiDetection[];
    model_used?: string;
    processing_time?: number;
};

type DetectionScreenConfig = {
    title: string;
    description: string;
    endpoint: string;
    defaultClassName: string;
    scanButtonColor: string;
    bboxColor: { border: string; bg: string };
    descriptionBgColor: string;
};

const normalizeBbox = (
    bbox: ApiDetection["bbox"],
): { x: number; y: number; w: number; h: number } | undefined => {
    if (!bbox) return undefined;

    if (Array.isArray(bbox) && bbox.length >= 4) {
        const [x, y, w, h] = bbox;
        return { x, y, w, h };
    }

    const b = bbox as Record<string, number>;
    if (b.x != null && b.y != null && b.w != null && b.h != null) {
        return { x: b.x, y: b.y, w: b.w, h: b.h };
    }

    return {
        x: b.x1,
        y: b.y1,
        w: Math.max(0, b.x2 - b.x1),
        h: Math.max(0, b.y2 - b.y1),
    };
};

const getBackendInputSize = (natural: { w: number; h: number }) => {
    const scale = Math.min(
        BACKEND_MAX_DIMENSION / natural.w,
        BACKEND_MAX_DIMENSION / natural.h,
        1,
    );
    return {
        w: natural.w * scale,
        h: natural.h * scale,
    };
};

export default function DetectionScreen({
    config,
}: {
    config: DetectionScreenConfig;
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [modelUsed, setModelUsed] = useState<string | null>(null);
    const [rows, setRows] = useState<
        Array<{ class_name: string; confidence: number }>
    >([]);
    const [detections, setDetections] = useState<
        Array<{
            class_name: string;
            confidence: number;
            bbox?: { x: number; y: number; w: number; h: number };
        }>
    >([]);
    const [imageNaturalSize, setImageNaturalSize] = useState<{
        w: number;
        h: number;
    } | null>(null);
    const [imageLayout, setImageLayout] = useState<{
        w: number;
        h: number;
    } | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const pickImage = async () => {
        const permission =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
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
        Image.getSize(
            asset.uri,
            (w, h) => setImageNaturalSize({ w, h }),
            () => setImageNaturalSize(null),
        );
        setDetections([]);
        setRows([]);
        setMessage(null);
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
        setDetections([]);

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

            const res = await fetch(`${API_BASE}${config.endpoint}`, {
                method: "POST",
                body: form,
            });
            const text = await res.text();
            const data = JSON.parse(text) as ApiSingleResponse;

            if (!res.ok || !data.success) {
                throw new Error(
                    data.message || `Request failed (${res.status})`,
                );
            }

            const parsedRows: Array<{
                class_name: string;
                confidence: number;
            }> = (data.detections ?? []).map((d) => ({
                class_name: d.class_name ?? config.defaultClassName,
                confidence: d.confidence,
            }));
            parsedRows.sort((a, b) => b.confidence - a.confidence);
            setRows(parsedRows);

            const parsedDetections = (data.detections ?? []).map((d) => ({
                class_name: d.class_name ?? config.defaultClassName,
                confidence: d.confidence,
                bbox: normalizeBbox(d.bbox),
            }));
            setDetections(parsedDetections);
            setMessage(data.message);
            setModelUsed(data.model_used ?? null);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            setError(msg);
            setRows([]);
            setDetections([]);
        } finally {
            setLoading(false);
        }
    };

    const getStyles = () =>
        StyleSheet.create({
            screen: { flex: 1, backgroundColor: "#F5F5F7" },
            scroll: {
                paddingHorizontal: 14,
                paddingTop: 10,
                paddingBottom: 18,
            },
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
                backgroundColor: config.descriptionBgColor,
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
                alignSelf: "center",
                width: "80%",
            },
            imagePreview: {
                width: "100%",
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
            uploadBtnText: {
                color: "#1A2241",
                fontSize: 14,
                fontWeight: "600",
            },
            scanBtn: {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: config.scanButtonColor,
                borderRadius: 10,
                paddingVertical: 12,
                gap: 8,
                marginBottom: 12,
            },
            scanBtnDisabled: { opacity: 0.5 },
            scanBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
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
            errorText: {
                color: "#A23F3F",
                fontSize: 12,
                lineHeight: 16,
                flex: 1,
            },
            recentWrap: { marginTop: 20, marginBottom: 20 },
            recentTitle: {
                color: "#4B526D",
                fontSize: 12,
                fontWeight: "700",
                marginBottom: 10,
            },
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
                backgroundColor: config.scanButtonColor,
                borderRadius: 3,
            },
            confidenceText: {
                color: "#697299",
                fontSize: 10,
                fontWeight: "500",
            },
        });

    const styles = getStyles();

    return (
        <SafeAreaView style={styles.screen}>
            <StatusBar barStyle="dark-content" />
            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
            >
                <View style={styles.headerContainer}>
                    <Pressable
                        onPress={() => router.back()}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color="#1A2343" />
                    </Pressable>
                    <Text style={styles.brand}>{config.title}</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.descriptionBox}>
                    <Ionicons
                        name="information-circle"
                        size={20}
                        color="#1A2241"
                    />
                    <Text style={styles.description}>{config.description}</Text>
                </View>

                {selectedImage && (
                    <View style={styles.imagePreviewContainer}>
                        <Image
                            source={{ uri: selectedImage }}
                            resizeMode="contain"
                            style={[
                                styles.imagePreview,
                                imageNaturalSize
                                    ? {
                                          aspectRatio:
                                              imageNaturalSize.w /
                                              imageNaturalSize.h,
                                      }
                                    : null,
                            ]}
                            onLayout={(ev) => {
                                const { width: w, height: h } =
                                    ev.nativeEvent.layout;
                                setImageLayout({ w, h });
                            }}
                        />
                        {imageNaturalSize &&
                            imageLayout &&
                            detections.length > 0 && (
                                <View
                                    style={StyleSheet.absoluteFill}
                                    pointerEvents="none"
                                >
                                    {detections.map((det, idx) => {
                                        if (
                                            !det.bbox ||
                                            det.confidence <=
                                                MIN_DRAW_CONFIDENCE
                                        )
                                            return null;
                                        const backendSize =
                                            getBackendInputSize(
                                                imageNaturalSize,
                                            );
                                        const scaleX =
                                            imageLayout.w / backendSize.w;
                                        const scaleY =
                                            imageLayout.h / backendSize.h;
                                        const left = det.bbox.x * scaleX;
                                        const top = det.bbox.y * scaleY;
                                        const boxW = det.bbox.w * scaleX;
                                        const boxH = det.bbox.h * scaleY;
                                        return (
                                            <View
                                                key={`box-${idx}`}
                                                style={{
                                                    position: "absolute",
                                                    left,
                                                    top,
                                                    width: boxW,
                                                    height: boxH,
                                                    borderWidth: 2,
                                                    borderColor:
                                                        config.bboxColor.border,
                                                    backgroundColor:
                                                        config.bboxColor.bg,
                                                }}
                                            />
                                        );
                                    })}
                                </View>
                            )}
                        <Pressable
                            style={styles.removeImageButton}
                            onPress={() => setSelectedImage(null)}
                        >
                            <Ionicons
                                name="close-circle"
                                size={24}
                                color="#fff"
                            />
                        </Pressable>
                    </View>
                )}

                <Pressable style={styles.uploadBtn} onPress={pickImage}>
                    <Ionicons name="cloud-upload" size={20} color="#1A2241" />
                    <Text style={styles.uploadBtnText}>
                        {selectedImage
                            ? "Змінити зображення"
                            : "Завантажити зображення"}
                    </Text>
                </Pressable>

                <Pressable
                    style={[
                        styles.scanBtn,
                        !selectedImage || loading
                            ? styles.scanBtnDisabled
                            : null,
                    ]}
                    onPress={performScan}
                    disabled={!selectedImage || loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <>
                            <Ionicons name="scan" size={20} color="#fff" />
                            <Text style={styles.scanBtnText}>
                                Почати сканування
                            </Text>
                        </>
                    )}
                </Pressable>

                {error != null ? (
                    <View style={styles.errorBox}>
                        <Ionicons
                            name="alert-circle"
                            size={16}
                            color="#A23F3F"
                        />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                {message != null && (
                    <View style={styles.recentWrap}>
                        <Text style={styles.recentTitle}>
                            Результати сканування
                        </Text>
                        <View style={styles.resultCard}>
                            <Text style={styles.resultTitle}>{message}</Text>
                            <Text style={styles.resultMeta}>
                                {config.title} • {rows.length} виявлень
                            </Text>
                            {modelUsed != null ? (
                                <Text style={styles.resultMeta}>
                                    Модель: {modelUsed}
                                </Text>
                            ) : null}
                            <View style={styles.detectionsList}>
                                {rows.map((row, i) => (
                                    <View
                                        key={`${row.class_name}-${i}`}
                                        style={styles.detectionItem}
                                    >
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
