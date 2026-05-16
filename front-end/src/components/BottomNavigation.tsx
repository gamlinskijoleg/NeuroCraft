import { useRouter, useSegments } from "expo-router";
import { useState, useEffect, useRef } from "react";
import {
    Animated,
    Easing,
    View,
    Pressable,
    Text,
    StyleSheet,
    useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function BottomNavigation() {
    const router = useRouter();
    const segments = useSegments();
    const [activeTab, setActiveTab] = useState<string>("index");
    const { width } = useWindowDimensions();

    const itemSize = Math.max(40, Math.min(64, Math.round(width * 0.12)));
    const containerPaddingHorizontal = Math.max(12, Math.round(width * 0.04));
    const containerPaddingVertical = width < 360 ? 8 : 12;
    const activePaddingHorizontal = Math.max(10, Math.round(width * 0.05));
    const activePaddingVertical = Math.max(8, Math.round(width * 0.03));
    const labelFontSize = width < 360 ? 12 : 14;

    const scalesRef = useRef({
        index: new Animated.Value(1),
        map: new Animated.Value(1),
        goals: new Animated.Value(1),
        user: new Animated.Value(1),
    });

    useEffect(() => {
        if (!segments) {
            setActiveTab("index");
        } else {
            const last = segments[segments.length - 1];
            if (last === "map") setActiveTab("map");
            else if (last === "goals") setActiveTab("goals");
            else if (last === "user") setActiveTab("user");
            else setActiveTab("index");
        }
    }, [segments]);

    useEffect(() => {
        const keys = ["index", "map", "goals", "user"] as const;
        const animations: Animated.CompositeAnimation[] = [];
        keys.forEach((k) => {
            const toValue = k === activeTab ? 1.06 : 1;
            animations.push(
                Animated.timing(scalesRef.current[k], {
                    toValue,
                    duration: 180,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
            );
        });
        Animated.parallel(animations).start();
    }, [activeTab]);

    return (
        <View
            style={[
                styles.bottomNav,
                {
                    paddingHorizontal: containerPaddingHorizontal,
                    paddingVertical: containerPaddingVertical,
                    marginBottom: width < 420 ? 28 : 42,
                    borderRadius: Math.min(50, Math.round(width * 0.08)),
                    alignSelf: "center",
                },
            ]}
        >
            <Animated.View
                style={{ transform: [{ scale: scalesRef.current.index }] }}
            >
                <Pressable
                    onPress={() => {
                        router.push("/");
                    }}
                    style={[
                        styles.navItemButton,
                        activeTab === "index"
                            ? [
                                  styles.navItemButtonActive,
                                  {
                                      width: "auto",
                                      paddingHorizontal:
                                          activePaddingHorizontal,
                                      paddingVertical: activePaddingVertical,
                                      borderRadius: Math.round(itemSize / 2),
                                  },
                              ]
                            : {
                                  width: itemSize,
                                  height: itemSize,
                                  borderRadius: itemSize / 2,
                              },
                    ]}
                >
                    <Ionicons
                        name="home"
                        size={Math.round(itemSize * 0.36)}
                        color={activeTab === "index" ? "#1a1a2e" : "#fff"}
                    />
                    {activeTab === "index" && (
                        <Text
                            style={[
                                styles.navLabelActive,
                                { fontSize: labelFontSize },
                            ]}
                        >
                            Головна
                        </Text>
                    )}
                </Pressable>
            </Animated.View>

            <Animated.View
                style={{ transform: [{ scale: scalesRef.current.map }] }}
            >
                <Pressable
                    onPress={() => {
                        router.push("/map");
                    }}
                    style={[
                        styles.navItemButton,
                        activeTab === "map"
                            ? [
                                  styles.navItemButtonActive,
                                  {
                                      width: "auto",
                                      paddingHorizontal:
                                          activePaddingHorizontal,
                                      paddingVertical: activePaddingVertical,
                                      borderRadius: Math.round(itemSize / 2),
                                  },
                              ]
                            : {
                                  width: itemSize,
                                  height: itemSize,
                                  borderRadius: itemSize / 2,
                              },
                    ]}
                >
                    <Ionicons
                        name="map"
                        size={Math.round(itemSize * 0.36)}
                        color={activeTab === "map" ? "#1a1a2e" : "#fff"}
                    />
                    {activeTab === "map" && (
                        <Text
                            style={[
                                styles.navLabelActive,
                                { fontSize: labelFontSize },
                            ]}
                        >
                            Карта
                        </Text>
                    )}
                </Pressable>
            </Animated.View>

            <Animated.View
                style={{ transform: [{ scale: scalesRef.current.goals }] }}
            >
                <Pressable
                    onPress={() => {
                        router.push("/goals");
                    }}
                    style={[
                        styles.navItemButton,
                        activeTab === "goals"
                            ? [
                                  styles.navItemButtonActive,
                                  {
                                      width: "auto",
                                      paddingHorizontal:
                                          activePaddingHorizontal,
                                      paddingVertical: activePaddingVertical,
                                      borderRadius: Math.round(itemSize / 2),
                                  },
                              ]
                            : {
                                  width: itemSize,
                                  height: itemSize,
                                  borderRadius: itemSize / 2,
                              },
                    ]}
                >
                    <Ionicons
                        name="flag"
                        size={Math.round(itemSize * 0.36)}
                        color={activeTab === "goals" ? "#1a1a2e" : "#fff"}
                    />
                    {activeTab === "goals" && (
                        <Text
                            style={[
                                styles.navLabelActive,
                                { fontSize: labelFontSize },
                            ]}
                        >
                            Цілі
                        </Text>
                    )}
                </Pressable>
            </Animated.View>

            <Animated.View
                style={{ transform: [{ scale: scalesRef.current.user }] }}
            >
                <Pressable
                    onPress={() => {
                        router.push("/user");
                    }}
                    style={[
                        styles.navItemButton,
                        activeTab === "user"
                            ? [
                                  styles.navItemButtonActive,
                                  {
                                      width: "auto",
                                      paddingHorizontal:
                                          activePaddingHorizontal,
                                      paddingVertical: activePaddingVertical,
                                      borderRadius: Math.round(itemSize / 2),
                                  },
                              ]
                            : {
                                  width: itemSize,
                                  height: itemSize,
                                  borderRadius: itemSize / 2,
                              },
                    ]}
                >
                    <Ionicons
                        name="person"
                        size={Math.round(itemSize * 0.36)}
                        color={activeTab === "user" ? "#1a1a2e" : "#fff"}
                    />
                    {activeTab === "user" && (
                        <Text
                            style={[
                                styles.navLabelActive,
                                { fontSize: labelFontSize },
                            ]}
                        >
                            Профіль
                        </Text>
                    )}
                </Pressable>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    bottomNav: {
        flexDirection: "row",
        backgroundColor: "#0f1430",
        borderRadius: 50,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginHorizontal: 16,
        marginBottom: 42,
        justifyContent: "flex-start",
        alignItems: "center",
        gap: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
        elevation: 10,
    },
    navItemButton: {
        width: 50,
        height: 50,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#172033",
        borderRadius: 50,
    },
    navItemButtonActive: {
        width: "auto",
        paddingVertical: 12,
        paddingHorizontal: 22,
        backgroundColor: "#4CAF50",
        borderRadius: 28,
        flexDirection: "row",
        gap: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
        elevation: 3,
    },
    navLabelActive: {
        fontSize: 14,
        color: "#1a1a2e",
        fontWeight: "700",
    },
});
