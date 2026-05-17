import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, {
    Circle,
    Defs,
    Line,
    LinearGradient,
    Path,
    Polygon,
    Rect,
    Stop,
} from "react-native-svg";

import { API_BASE, API_URLS } from "../../src/constants/config";
import { useAuth } from "../../src/context/AuthContext";
import type {
    GoalAchievement,
    GoalChallenge,
    GoalsResponse,
} from "../../src/types/api";

type TabKey = "challenges" | "achievements";

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

function displayNameFromUser(email?: string, username?: string | null) {
    if (username && username.trim().length > 0) {
        return username.trim();
    }

    if (!email) {
        return "Driver";
    }

    const localPart = email.split("@")[0] ?? "Driver";
    return localPart
        .split(/[._-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function RoadScanIcon({ accent }: { accent: string }) {
    return (
        <Svg viewBox="0 0 88 88" width="100%" height="100%">
            <Defs>
                <LinearGradient id="scanSky" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#BFE5FF" />
                    <Stop offset="100%" stopColor="#F0FAFF" />
                </LinearGradient>
                <LinearGradient id="scanRoad" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0%" stopColor="#2F4C6A" />
                    <Stop offset="100%" stopColor="#17253A" />
                </LinearGradient>
            </Defs>
            <Circle cx="44" cy="44" r="42" fill={accent} opacity="0.12" />
            <Circle
                cx="44"
                cy="44"
                r="34"
                fill="url(#scanSky)"
                stroke="#F3F5FA"
                strokeWidth="2"
            />
            <Path d="M25 63L38 37h12l13 26H25Z" fill="url(#scanRoad)" />
            <Line
                x1="44"
                y1="39"
                x2="44"
                y2="63"
                stroke="#F8FBFF"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="5 4"
            />
            <Rect
                x="30"
                y="29"
                width="28"
                height="16"
                rx="3"
                fill="none"
                stroke="#2D8CFF"
                strokeWidth="2.4"
            />
            <Line x1="24" y1="24" x2="32" y2="24" stroke="#2D8CFF" strokeWidth="3" strokeLinecap="round" />
            <Line x1="24" y1="24" x2="24" y2="32" stroke="#2D8CFF" strokeWidth="3" strokeLinecap="round" />
            <Line x1="56" y1="24" x2="64" y2="24" stroke="#2D8CFF" strokeWidth="3" strokeLinecap="round" />
            <Line x1="64" y1="24" x2="64" y2="32" stroke="#2D8CFF" strokeWidth="3" strokeLinecap="round" />
        </Svg>
    );
}

function PotholeIcon({ accent }: { accent: string }) {
    return (
        <Svg viewBox="0 0 88 88" width="100%" height="100%">
            <Defs>
                <LinearGradient id="potholeSky" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#A7D8FF" />
                    <Stop offset="100%" stopColor="#ECF8FF" />
                </LinearGradient>
                <LinearGradient id="potholeGround" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#7C8B71" />
                    <Stop offset="100%" stopColor="#4E5A47" />
                </LinearGradient>
            </Defs>
            <Circle cx="44" cy="44" r="42" fill={accent} opacity="0.12" />
            <Circle
                cx="44"
                cy="44"
                r="34"
                fill="url(#potholeSky)"
                stroke="#F3F5FA"
                strokeWidth="2"
            />
            <Path d="M18 56c8-9 15-12 26-12s18 3 26 12v10H18V56Z" fill="url(#potholeGround)" />
            <Path d="M29 57l8-7 4 4 7-6 4 5 8-5" fill="none" stroke="#202022" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx="56" cy="31" r="17" fill="#FFC53A" />
            <Path d="M56 23l1.7 5.2h5.5l-4.5 3.3 1.7 5.2-4.4-3.3-4.4 3.3 1.7-5.2-4.5-3.3h5.5L56 23Z" fill="#202022" />
        </Svg>
    );
}

function SignIcon({ accent }: { accent: string }) {
    return (
        <Svg viewBox="0 0 88 88" width="100%" height="100%">
            <Defs>
                <LinearGradient id="signSky" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#9DD9FF" />
                    <Stop offset="100%" stopColor="#F0FBFF" />
                </LinearGradient>
            </Defs>
            <Circle cx="44" cy="44" r="42" fill={accent} opacity="0.12" />
            <Circle
                cx="44"
                cy="44"
                r="34"
                fill="url(#signSky)"
                stroke="#F3F5FA"
                strokeWidth="2"
            />
            <Rect x="29" y="18" width="30" height="18" rx="9" fill="#E43C3C" />
            <Circle cx="44" cy="44" r="22" fill="#FFFFFF" stroke="#344053" strokeWidth="4" />
            <Line x1="44" y1="54" x2="44" y2="70" stroke="#5B677A" strokeWidth="4" strokeLinecap="round" />
            <Path d="M33 44c0-6.1 5.3-11 11.8-11S56.6 37.9 56.6 44 51.3 55 44.8 55 33 50.1 33 44Z" fill="none" stroke="#F59E0B" strokeWidth="3.5" />
        </Svg>
    );
}

function ShieldIcon({ accent }: { accent: string }) {
    return (
        <Svg viewBox="0 0 88 88" width="100%" height="100%">
            <Defs>
                <LinearGradient id="shieldSky" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#89D4FF" />
                    <Stop offset="100%" stopColor="#F0FBFF" />
                </LinearGradient>
            </Defs>
            <Circle cx="44" cy="44" r="42" fill={accent} opacity="0.12" />
            <Circle
                cx="44"
                cy="44"
                r="34"
                fill="url(#shieldSky)"
                stroke="#F3F5FA"
                strokeWidth="2"
            />
            <Path d="M44 22l16 5v12c0 10-6.2 18.3-16 23-9.8-4.7-16-13-16-23V27l16-5Z" fill="#2563EB" />
            <Path d="M37.5 43.5l4.2 4.2 9.7-10" fill="none" stroke="#F5FBFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M24 62c4.8 3 11.7 5 20 5s15.2-2 20-5" fill="none" stroke="#2E8B57" strokeWidth="3" strokeLinecap="round" />
        </Svg>
    );
}

function LockIcon() {
    return (
        <Svg viewBox="0 0 28 28" width="100%" height="100%">
            <Rect x="6" y="12" width="16" height="10" rx="3" fill="#101828" />
            <Path d="M10 12V9.2a4 4 0 0 1 8 0V12" fill="none" stroke="#101828" strokeWidth="2.5" strokeLinecap="round" />
        </Svg>
    );
}

function GoalIllustration({ icon, accent }: { icon: string; accent: string }) {
    switch (icon) {
        case "pothole":
            return <PotholeIcon accent={accent} />;
        case "sign":
            return <SignIcon accent={accent} />;
        case "shield":
            return <ShieldIcon accent={accent} />;
        case "scan":
        default:
            return <RoadScanIcon accent={accent} />;
    }
}

function ProgressBar({ progress, target, accent }: { progress: number; target: number; accent: string }) {
    const ratio = Math.max(0, Math.min(progress / target, 1));

    return (
        <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${ratio * 100}%`, backgroundColor: accent }]} />
        </View>
    );
}

function GoalCard({
    title,
    description,
    icon,
    accent,
    locked = false,
    progress,
    target,
    statusLabel,
}: {
    title: string;
    description: string;
    icon: string;
    accent: string;
    locked?: boolean;
    progress?: number;
    target?: number;
    statusLabel: string;
}) {
    return (
        <View style={[styles.goalCard, locked && styles.goalCardLocked]}>
            <View style={styles.goalIconWrap}>
                <GoalIllustration icon={icon} accent={accent} />
                {locked ? (
                    <View style={styles.lockBadge}>
                        <LockIcon />
                    </View>
                ) : null}
            </View>
            <Text style={styles.goalTitle}>{title}</Text>
            <Text style={styles.goalDescription}>{description}</Text>
            {typeof progress === "number" && typeof target === "number" ? (
                <>
                    <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>Progress</Text>
                        <Text style={styles.progressValue}>
                            {progress}/{target}
                        </Text>
                    </View>
                    <ProgressBar progress={progress} target={target} accent={accent} />
                </>
            ) : null}
            <View
                style={[
                    styles.statusPill,
                    locked ? styles.statusPillLocked : styles.statusPillUnlocked,
                ]}
            >
                <Text
                    style={[
                        styles.statusText,
                        locked ? styles.statusTextLocked : styles.statusTextUnlocked,
                    ]}
                >
                    {statusLabel}
                </Text>
            </View>
        </View>
    );
}

export default function GoalsScreen() {
    const { width } = useWindowDimensions();
    const { session, user, isReady, isAuthenticated } = useAuth();
    const [activeTab, setActiveTab] = useState<TabKey>("challenges");
    const [payload, setPayload] = useState<GoalsResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const displayName = useMemo(
        () => displayNameFromUser(user?.email, user?.username),
        [user?.email, user?.username],
    );

    useEffect(() => {
        if (!isReady) {
            return;
        }

        if (!isAuthenticated || !session?.access_token) {
            setPayload(null);
            setError(null);
            setLoading(false);
            return;
        }

        let active = true;

        const loadGoals = async () => {
            setLoading(true);
            setError(null);

            if (API_BASE.length === 0) {
                if (active) {
                    setLoading(false);
                    setError("Укажіть EXPO_PUBLIC_API_URL для релізних збірок");
                }
                return;
            }

            try {
                const response = await fetch(API_URLS.GOALS, {
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                    },
                });
                const data = (await parseResponseBody(response)) as
                    | GoalsResponse
                    | { detail?: string }
                    | string
                    | null;

                if (
                    !response.ok ||
                    !data ||
                    typeof data !== "object" ||
                    !("success" in data)
                ) {
                    const message =
                        typeof data === "string"
                            ? data
                            : data && typeof data === "object" && "detail" in data && typeof data.detail === "string"
                              ? data.detail
                              : `Запит не виконано (${response.status})`;
                    throw new Error(message);
                }

                if (active) {
                    setPayload(data);
                }
            } catch (e) {
                if (active) {
                    setPayload(null);
                    setError(e instanceof Error ? e.message : String(e));
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        void loadGoals();

        return () => {
            active = false;
        };
    }, [isAuthenticated, isReady, session?.access_token]);

    const challenges = payload?.challenges ?? [];
    const achievements = useMemo(
        () =>
            [...(payload?.achievements ?? [])].sort((left, right) => {
                if (left.unlocked === right.unlocked) {
                    return left.title.localeCompare(right.title);
                }

                return left.unlocked ? -1 : 1;
            }),
        [payload?.achievements],
    );

    const cardWidth = Math.floor((width - 40 - 12) / 2);
    const currentItems = activeTab === "challenges" ? challenges : achievements;

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
                    <View style={styles.authMark}>
                        <Text style={styles.authMarkText}>ER</Text>
                    </View>
                    <Text style={styles.authTitle}>Goals need a session</Text>
                    <Text style={styles.authText}>
                        Sign in to sync your challenges and achievements with the backend.
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.screen}>
            <StatusBar barStyle="dark-content" />
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.header}>
                    <Text style={styles.brand}>EasyRoad</Text>
                    <View style={styles.profileRow}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {displayName.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.profileCopy}>
                            <Text style={styles.profileName}>{displayName}</Text>
                            <Text style={styles.profileLevel}>Beginner</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.tabsWrap}>
                    <Pressable
                        onPress={() => setActiveTab("challenges")}
                        style={({ pressed }) => [
                            styles.tabButton,
                            activeTab === "challenges" && styles.tabButtonActive,
                            pressed && styles.pressed,
                        ]}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === "challenges" && styles.tabTextActive,
                            ]}
                        >
                            Challenges
                        </Text>
                    </Pressable>
                    <Pressable
                        onPress={() => setActiveTab("achievements")}
                        style={({ pressed }) => [
                            styles.tabButton,
                            activeTab === "achievements" && styles.tabButtonActive,
                            pressed && styles.pressed,
                        ]}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === "achievements" && styles.tabTextActive,
                            ]}
                        >
                            Achievements
                        </Text>
                    </Pressable>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        {activeTab === "challenges" ? "Challenges" : "Achievements"}
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                        {activeTab === "challenges"
                            ? "Finish road tasks to unlock more achievements."
                            : "Completed milestones stay open, the rest remain locked."}
                    </Text>
                </View>

                {loading ? (
                    <View style={styles.loaderWrapInline}>
                        <ActivityIndicator size="large" color="#1E90FF" />
                    </View>
                ) : error ? (
                    <View style={styles.errorCard}>
                        <Text style={styles.errorTitle}>Could not load goals</Text>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : (
                    <View style={styles.grid}>
                        {currentItems.map((item, index) => {
                            const isChallenge = activeTab === "challenges";
                            const challengeItem = item as GoalChallenge;
                            const achievementItem = item as GoalAchievement;
                            const locked = !isChallenge && !achievementItem.unlocked;

                            return (
                                <View
                                    key={item.id}
                                    style={[
                                        styles.gridItem,
                                        { width: cardWidth },
                                        index % 2 === 0 ? styles.gridItemLeft : styles.gridItemRight,
                                    ]}
                                >
                                    <GoalCard
                                        title={item.title}
                                        description={item.description}
                                        icon={item.icon}
                                        accent={item.accent}
                                        locked={locked}
                                        progress={isChallenge ? challengeItem.progress : undefined}
                                        target={isChallenge ? challengeItem.target : undefined}
                                        statusLabel={
                                            isChallenge
                                                ? `${challengeItem.progress}/${challengeItem.target} done`
                                                : locked
                                                  ? "Locked"
                                                  : "Unlocked"
                                        }
                                    />
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#F3F6FB",
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 120,
    },
    header: {
        marginBottom: 20,
    },
    brand: {
        color: "#101828",
        fontSize: 28,
        fontWeight: "800",
        letterSpacing: -0.6,
        marginBottom: 18,
    },
    profileRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "#183153",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
    },
    avatarText: {
        color: "#F7FAFF",
        fontSize: 26,
        fontWeight: "800",
    },
    profileCopy: {
        flex: 1,
    },
    profileName: {
        color: "#101828",
        fontSize: 22,
        fontWeight: "800",
        marginBottom: 4,
    },
    profileLevel: {
        color: "#5E6A84",
        fontSize: 15,
        fontWeight: "600",
    },
    tabsWrap: {
        flexDirection: "row",
        backgroundColor: "#EEF2F7",
        borderRadius: 999,
        padding: 4,
        marginBottom: 18,
    },
    tabButton: {
        flex: 1,
        minHeight: 42,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
    },
    tabButtonActive: {
        backgroundColor: "#D7F1DC",
    },
    tabText: {
        color: "#69758E",
        fontSize: 15,
        fontWeight: "700",
    },
    tabTextActive: {
        color: "#155B2C",
    },
    sectionHeader: {
        marginBottom: 14,
    },
    sectionTitle: {
        color: "#101828",
        fontSize: 20,
        fontWeight: "800",
        marginBottom: 4,
    },
    sectionSubtitle: {
        color: "#667085",
        fontSize: 13,
        lineHeight: 19,
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    gridItem: {
        marginBottom: 14,
    },
    gridItemLeft: {
        marginRight: 12,
    },
    gridItemRight: {
        marginRight: 0,
    },
    goalCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "#E4EAF3",
        padding: 14,
        minHeight: 250,
        shadowColor: "#101828",
        shadowOpacity: 0.05,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 2,
    },
    goalCardLocked: {
        opacity: 0.78,
    },
    goalIconWrap: {
        width: 86,
        height: 86,
        alignSelf: "center",
        marginBottom: 14,
    },
    lockBadge: {
        position: "absolute",
        right: -2,
        bottom: -2,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#F2F4F7",
        borderWidth: 1,
        borderColor: "#D0D5DD",
        alignItems: "center",
        justifyContent: "center",
    },
    goalTitle: {
        color: "#101828",
        fontSize: 15,
        fontWeight: "800",
        textAlign: "center",
        marginBottom: 6,
        lineHeight: 19,
    },
    goalDescription: {
        color: "#667085",
        fontSize: 12,
        lineHeight: 17,
        textAlign: "center",
        minHeight: 34,
        marginBottom: 10,
    },
    progressHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    progressLabel: {
        color: "#667085",
        fontSize: 11,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.7,
    },
    progressValue: {
        color: "#101828",
        fontSize: 12,
        fontWeight: "800",
    },
    progressTrack: {
        height: 8,
        backgroundColor: "#EDF1F7",
        borderRadius: 999,
        overflow: "hidden",
        marginBottom: 12,
    },
    progressFill: {
        height: "100%",
        borderRadius: 999,
    },
    statusPill: {
        alignSelf: "center",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
    },
    statusPillUnlocked: {
        backgroundColor: "#EAF8EF",
    },
    statusPillLocked: {
        backgroundColor: "#F2F4F7",
    },
    statusText: {
        fontSize: 11,
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: 0.7,
    },
    statusTextUnlocked: {
        color: "#1F7A3A",
    },
    statusTextLocked: {
        color: "#344054",
    },
    loaderWrap: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    loaderWrapInline: {
        minHeight: 220,
        alignItems: "center",
        justifyContent: "center",
    },
    errorCard: {
        backgroundColor: "#FFF4F4",
        borderWidth: 1,
        borderColor: "#FFD1D1",
        borderRadius: 20,
        padding: 16,
    },
    errorTitle: {
        color: "#B42318",
        fontSize: 16,
        fontWeight: "800",
        marginBottom: 6,
    },
    errorText: {
        color: "#7A271A",
        fontSize: 14,
        lineHeight: 20,
    },
    authCard: {
        flex: 1,
        marginTop: 18,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
    },
    authMark: {
        width: 84,
        height: 84,
        borderRadius: 42,
        backgroundColor: "#183153",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    authMarkText: {
        color: "#F7FAFF",
        fontSize: 24,
        fontWeight: "800",
        letterSpacing: -0.6,
    },
    authTitle: {
        color: "#101828",
        fontSize: 24,
        fontWeight: "800",
        textAlign: "center",
        marginBottom: 8,
    },
    authText: {
        color: "#667085",
        fontSize: 15,
        lineHeight: 22,
        textAlign: "center",
    },
    pressed: {
        opacity: 0.82,
    },
});
