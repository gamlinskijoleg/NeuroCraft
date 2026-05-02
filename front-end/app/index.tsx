import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";

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

type ApiBbox = { x1: number; y1: number; x2: number; y2: number };

type ApiCrackDetection = {
    class_name?: string;
    confidence: number;
    bbox: ApiBbox | null;
    coordinates?: ApiBbox | [number, number, number, number] | { x?: number; y?: number; width?: number; height?: number } | null;
};

type ApiProcessAllResponse = {
    success: boolean;
    message?: string;
    results?: {
        cracks?: {
            success: boolean;
            detections?: ApiCrackDetection[];
            error?: string;
            model?: string;
        };
        signs?: {
            success: boolean;
            detections?: { class_name?: string; confidence: number; bbox?: ApiBbox | null }[];
            error?: string;
            model?: string;
        };
    };
};

type CrackRow = { class_name: string; confidence: number; bbox: ApiBbox | null };

type SignPrediction = { label: string; confidence: number };

type ResponseMeta = {
    message: string;
    cracks: CrackRow[];
    crackModel?: string;
    signLabel: string;
    signConfidence: number;
    signModel?: string;
    topPredictions: SignPrediction[];
};

function toBboxFromCoordinates(value: ApiCrackDetection["coordinates"] | ApiCrackDetection["bbox"] | undefined): ApiBbox | null {
    if (value == null) {
        return null;
    }
    if (Array.isArray(value) && value.length >= 4) {
        const [x1, y1, x2, y2] = value;
        if ([x1, y1, x2, y2].every((v) => typeof v === "number" && Number.isFinite(v))) {
            return { x1, y1, x2, y2 };
        }
        return null;
    }
    if ("x1" in value && "y1" in value && "x2" in value && "y2" in value) {
        const { x1, y1, x2, y2 } = value;
        if ([x1, y1, x2, y2].every((v) => typeof v === "number" && Number.isFinite(v))) {
            return { x1, y1, x2, y2 };
        }
    }
    if ("x" in value && "y" in value && "width" in value && "height" in value) {
        const { x, y, width, height } = value;
        if ([x, y, width, height].every((v) => typeof v === "number" && Number.isFinite(v))) {
            const nx = x as number;
            const ny = y as number;
            const nWidth = width as number;
            const nHeight = height as number;
            return { x1: nx, y1: ny, x2: nx + nWidth, y2: ny + nHeight };
        }
    }
    return null;
}

function clampPct(value: number) {
    return Math.min(100, Math.max(0, value));
}

/** Map API bbox to pixel space of the local file, then clamp so overlays stay inside the photo (not letterbox). */
function normalizeBBoxToImagePixels(bbox: ApiBbox, naturalW: number, naturalH: number): ApiBbox {
    const maxAbs = Math.max(Math.abs(bbox.x1), Math.abs(bbox.x2), Math.abs(bbox.y1), Math.abs(bbox.y2));
    let x1 = bbox.x1;
    let y1 = bbox.y1;
    let x2 = bbox.x2;
    let y2 = bbox.y2;

    if (maxAbs <= 1.0001) {
        x1 *= naturalW;
        x2 *= naturalW;
        y1 *= naturalH;
        y2 *= naturalH;
    }

    const clamp = (v: number, max: number) => Math.min(max, Math.max(0, v));
    const lx = clamp(Math.min(x1, x2), naturalW);
    const ty = clamp(Math.min(y1, y2), naturalH);
    const rx = clamp(Math.max(x1, x2), naturalW);
    const by = clamp(Math.max(y1, y2), naturalH);

    return { x1: lx, y1: ty, x2: rx, y2: by };
}

function bboxToOverlayPercent(bbox: ApiBbox, naturalW: number, naturalH: number, frameW: number, frameH: number) {
    const scale = Math.min(frameW / naturalW, frameH / naturalH);
    const dispW = naturalW * scale;
    const dispH = naturalH * scale;
    const ox = (frameW - dispW) / 2;
    const oy = (frameH - dispH) / 2;
    const normalized = normalizeBBoxToImagePixels(bbox, naturalW, naturalH);
    const x1 = Math.min(normalized.x1, normalized.x2);
    const y1 = Math.min(normalized.y1, normalized.y2);
    const x2 = Math.max(normalized.x1, normalized.x2);
    const y2 = Math.max(normalized.y1, normalized.y2);
    const left = ox + x1 * scale;
    const top = oy + y1 * scale;
    const width = (x2 - x1) * scale;
    const height = (y2 - y1) * scale;
    return {
        leftPct: clampPct((left / frameW) * 100),
        topPct: clampPct((top / frameH) * 100),
        widthPct: clampPct((width / frameW) * 100),
        heightPct: clampPct((height / frameH) * 100)
    };
}

function parseBackendSigns(signsBlock: NonNullable<ApiProcessAllResponse["results"]>["signs"] | undefined) {
    if (!signsBlock) {
        return {
            label: "No traffic sign detected",
            confidence: 0,
            topPredictions: [] as SignPrediction[],
            model: undefined as string | undefined
        };
    }

    const block = signsBlock;

    if (!block.success) {
        return {
            label: block.error ? `Signs: ${block.error}` : "No traffic sign detected",
            confidence: 0,
            topPredictions: [] as SignPrediction[],
            model: block.model
        };
    }

    const raw = block.detections ?? [];
    const topPredictions = [...raw]
        .map((d) => ({
            label: d.class_name ?? "Unknown",
            confidence: d.confidence
        }))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5);
    const best = topPredictions[0];
    return {
        label: best && best.confidence > 0.08 ? best.label : "No traffic sign detected",
        confidence: best?.confidence ?? 0,
        topPredictions,
        model: block.model
    };
}

export default function RoadVisionScreen() {
    const router = useRouter();
    const canGoBack = typeof router.canGoBack === "function" && router.canGoBack();
    const [localUri, setLocalUri] = useState<string | null>(null);
    const [responseMeta, setResponseMeta] = useState<ResponseMeta | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [fetchDurationMs, setFetchDurationMs] = useState<number | null>(null);
    const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
    const [frameLayout, setFrameLayout] = useState<{ width: number; height: number } | null>(null);

    useEffect(() => {
        if (localUri == null) {
            setNaturalSize(null);
            return;
        }
        void Image.getSize(
            localUri,
            (width, height) => setNaturalSize({ width, height }),
            () => setNaturalSize(null)
        );
    }, [localUri]);

    const pickAndDetect = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            setError("Photo library permission is required.");
            return;
        }

        const picked = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: false,
            quality: 0.8
        });

        if (picked.canceled || picked.assets.length === 0) {
            return;
        }

        const asset = picked.assets[0]!;
        setLocalUri(asset.uri);
        setFrameLayout(null);
        setNaturalSize(null);
        setResponseMeta(null);
        setError(null);
        setFetchDurationMs(null);

        if (API_BASE.length === 0) {
            setError("Set EXPO_PUBLIC_API_URL for release builds, or run in development.");
            return;
        }

        setLoading(true);
        const startedAt = performance.now();
        setFetchDurationMs(0);
        const tick = setInterval(() => {
            setFetchDurationMs(Math.round(performance.now() - startedAt));
        }, 50);

        try {
            const form = new FormData();
            form.append("file", {
                uri: asset.uri,
                name: "upload.jpg",
                type: "image/jpeg"
            } as unknown as Blob);

            const res = await fetch(`${API_BASE}/process/all`, {
                method: "POST",
                body: form
            });

            const text = await res.text();
            let data: ApiProcessAllResponse;
            try {
                data = JSON.parse(text) as ApiProcessAllResponse;
            } catch {
                throw new Error(text.slice(0, 200) || `HTTP ${res.status}`);
            }

            if (!res.ok || !data.success || !data.results) {
                throw new Error(data.message ?? `Request failed (${res.status})`);
            }

            const crackBlock = data.results.cracks;

            const cracks: CrackRow[] = [];
            if (crackBlock?.success && crackBlock.detections?.length) {
                for (const d of crackBlock.detections) {
                    cracks.push({
                        class_name: d.class_name ?? "Crack",
                        confidence: d.confidence,
                        bbox: toBboxFromCoordinates(d.coordinates) ?? toBboxFromCoordinates(d.bbox)
                    });
                }
            }

            const signsParsed = parseBackendSigns(data.results.signs);

            const signsBlock = data.results.signs;
            if (signsBlock?.success && signsBlock.detections?.length) {
                for (const d of signsBlock.detections) {
                    cracks.push({
                        class_name: d.class_name ?? "Sign",
                        confidence: d.confidence,
                        bbox: toBboxFromCoordinates(d.bbox)
                    });
                }
            }

            setResponseMeta({
                message: data.message ?? "Processing complete",
                cracks,
                crackModel: crackBlock?.model,
                signLabel: signsParsed.label,
                signConfidence: signsParsed.confidence,
                signModel: signsParsed.model,
                topPredictions: signsParsed.topPredictions
            });
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            setError(msg);
            setResponseMeta(null);
        } finally {
            clearInterval(tick);
            setFetchDurationMs(Math.round(performance.now() - startedAt));
            setLoading(false);
        }
    };

    const crackOverlayBoxes = useMemo(() => {
        if (responseMeta == null || naturalSize == null || frameLayout == null) {
            return [];
        }
        const { width: nw, height: nh } = naturalSize;
        const { width: fw, height: fh } = frameLayout;
        if (nw <= 0 || nh <= 0 || fw <= 0 || fh <= 0) {
            return [];
        }
        const out: { key: string; leftPct: number; topPct: number; widthPct: number; heightPct: number; label: string }[] = [];
        for (let i = 0; i < responseMeta.cracks.length; i += 1) {
            const row = responseMeta.cracks[i]!;
            if (row.bbox == null) {
                continue;
            }
            const p = bboxToOverlayPercent(row.bbox, nw, nh, fw, fh);
            out.push({
                key: `crack-box-${i}-${p.leftPct}-${p.topPct}`,
                ...p,
                label: `${row.class_name} ${(row.confidence * 100).toFixed(0)}%`
            });
        }
        return out;
    }, [frameLayout, naturalSize, responseMeta]);

    return (
        <SafeAreaView style={styles.screen}>
            <StatusBar barStyle="light-content" />
            <View style={styles.header}>
                {canGoBack ? (
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <Text style={styles.backBtnText}>← Back</Text>
                    </Pressable>
                ) : null}
                <Text style={styles.title}>Road Vision</Text>
                <Text style={styles.subtitle}>POST /process/all — cracks + signs with coordinate overlays on your photo</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <Pressable
                    style={[styles.primaryBtn, loading ? styles.primaryBtnDisabled : null]}
                    onPress={pickAndDetect}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="#06111B" /> : <Text style={styles.primaryBtnText}>Choose image and scan</Text>}
                </Pressable>

                {fetchDurationMs != null ? (
                    <Text style={styles.timerText}>
                        {loading ? "Fetching… " : "Request finished in "}
                        {fetchDurationMs < 1000 ? `${fetchDurationMs} ms` : `${(fetchDurationMs / 1000).toFixed(2)} s`}
                    </Text>
                ) : null}

                {API_BASE.length > 0 ? (
                    <Text style={styles.hint}>API: {API_BASE}</Text>
                ) : (
                    <Text style={styles.warn}>No API base URL (set EXPO_PUBLIC_API_URL).</Text>
                )}

                {error != null ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                {responseMeta != null ? (
                    <>
                        <View style={styles.metaCard}>
                            <Text style={styles.metaTitle}>{responseMeta.message}</Text>
                            {responseMeta.crackModel != null ? (
                                <Text style={styles.metaLine}>Cracks model: {responseMeta.crackModel}</Text>
                            ) : null}
                            <Text style={styles.metaLine}>Crack detections: {responseMeta.cracks.length}</Text>
                            {responseMeta.cracks.map((d, i) => (
                                <Text key={`crack-${i}-${d.class_name}`} style={styles.detectionLine}>
                                    {i + 1}. {d.class_name} — {(d.confidence * 100).toFixed(1)}%
                                </Text>
                            ))}
                        </View>

                        <View style={[styles.metaCard, styles.signCard]}>
                            <Text style={styles.metaTitle}>Traffic sign</Text>
                            {responseMeta.signModel != null ? <Text style={styles.metaLine}>Model: {responseMeta.signModel}</Text> : null}
                            <Text style={styles.signPrimary}>{responseMeta.signLabel}</Text>
                            <Text style={styles.metaLine}>Confidence: {(responseMeta.signConfidence * 100).toFixed(1)}%</Text>
                            <ScrollView style={styles.predictionsScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                                {responseMeta.topPredictions.map((p, index) => (
                                    <View key={`${p.label}-${index}`} style={styles.predictionRow}>
                                        <Text style={styles.predictionLabel} numberOfLines={1}>
                                            {index + 1}. {p.label}
                                        </Text>
                                        <Text style={styles.predictionConfidence}>{(p.confidence * 100).toFixed(1)}%</Text>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    </>
                ) : null}

                {localUri != null ? (
                    <View style={styles.imageWrap}>
                        <Text style={styles.imageLabel}>{crackOverlayBoxes.length > 0 ? "Your photo (boxes)" : "Your photo"}</Text>
                        <View
                            style={styles.imageFrame}
                            onLayout={(event) => {
                                const { width, height } = event.nativeEvent.layout;
                                setFrameLayout({ width, height });
                            }}
                        >
                            <Image source={{ uri: localUri }} style={styles.imageFill} resizeMode="contain" />
                            {crackOverlayBoxes.length > 0 ? (
                                <View pointerEvents="none" style={styles.overlayLayer}>
                                    {crackOverlayBoxes.map((box) => (
                                        <View
                                            key={box.key}
                                            style={[
                                                styles.detectionBox,
                                                {
                                                    left: `${box.leftPct}%`,
                                                    top: `${box.topPct}%`,
                                                    width: `${box.widthPct}%`,
                                                    height: `${box.heightPct}%`
                                                }
                                            ]}
                                        >
                                            <Text style={styles.detectionTagText} numberOfLines={1}>
                                                {box.label}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            ) : null}
                        </View>
                    </View>
                ) : null}

                {localUri == null && !loading ? <Text style={styles.placeholder}>Pick a photo to run detection.</Text> : null}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#07111D"
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 12
    },
    backBtn: {
        alignSelf: "flex-start",
        marginBottom: 8,
        paddingVertical: 4
    },
    backBtnText: {
        color: "#7CFFB2",
        fontSize: 16,
        fontWeight: "600"
    },
    title: {
        color: "#F7FBFF",
        fontSize: 26,
        fontWeight: "800"
    },
    subtitle: {
        marginTop: 6,
        color: "#9AA8B8",
        fontSize: 14,
        lineHeight: 20
    },
    scroll: {
        paddingHorizontal: 20,
        paddingBottom: 32
    },
    primaryBtn: {
        backgroundColor: "#7CFFB2",
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(0, 0, 0, 0.15)"
    },
    primaryBtnDisabled: {
        opacity: 0.7
    },
    primaryBtnText: {
        color: "#06111B",
        fontSize: 16,
        fontWeight: "800"
    },
    timerText: {
        marginTop: 12,
        color: "#C9E8FF",
        fontSize: 14,
        fontWeight: "600",
        textAlign: "center"
    },
    hint: {
        marginTop: 10,
        color: "#6B7A8C",
        fontSize: 12
    },
    warn: {
        marginTop: 10,
        color: "#FFB4A9",
        fontSize: 12
    },
    errorBox: {
        marginTop: 14,
        padding: 12,
        borderRadius: 12,
        backgroundColor: "rgba(255, 82, 82, 0.12)",
        borderWidth: 1,
        borderColor: "rgba(255, 82, 82, 0.35)"
    },
    errorText: {
        color: "#FFB4B4",
        fontSize: 14,
        lineHeight: 20
    },
    metaCard: {
        marginTop: 16,
        padding: 14,
        borderRadius: 16,
        backgroundColor: "rgba(5, 15, 26, 0.9)",
        borderWidth: 1,
        borderColor: "rgba(124, 255, 178, 0.22)"
    },
    signCard: {
        marginTop: 12
    },
    metaTitle: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700"
    },
    metaLine: {
        marginTop: 6,
        color: "#C6D2DE",
        fontSize: 13
    },
    signPrimary: {
        marginTop: 8,
        color: "#7CFFB2",
        fontSize: 18,
        fontWeight: "700"
    },
    predictionsScroll: {
        marginTop: 8,
        maxHeight: 140
    },
    predictionRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        marginTop: 6
    },
    predictionLabel: {
        flex: 1,
        color: "#DDE8F4",
        fontSize: 12
    },
    predictionConfidence: {
        color: "#7CFFB2",
        fontSize: 12,
        fontWeight: "700"
    },
    detectionLine: {
        marginTop: 4,
        color: "#9AA8B8",
        fontSize: 12
    },
    imageWrap: {
        marginTop: 20
    },
    imageLabel: {
        color: "#7CFFB2",
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.8,
        textTransform: "uppercase",
        marginBottom: 8
    },
    imageFrame: {
        width: "100%",
        aspectRatio: 3 / 4,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: "#101826",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)"
    },
    imageFill: {
        ...StyleSheet.absoluteFillObject
    },
    overlayLayer: {
        ...StyleSheet.absoluteFillObject
    },
    detectionBox: {
        position: "absolute",
        borderWidth: 2,
        borderColor: "#FF5252",
        borderRadius: 6,
        backgroundColor: "rgba(255, 82, 82, 0.08)"
    },
    detectionTagText: {
        alignSelf: "flex-start",
        color: "#FFFFFF",
        fontSize: 10,
        fontWeight: "700",
        backgroundColor: "rgba(255, 82, 82, 0.94)",
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderBottomRightRadius: 6,
        overflow: "hidden"
    },
    placeholder: {
        marginTop: 24,
        color: "#6B7A8C",
        fontSize: 14,
        textAlign: "center"
    }
});
