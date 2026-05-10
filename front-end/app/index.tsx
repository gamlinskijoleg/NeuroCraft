import { useRouter, useSegments } from "expo-router";
import { useState, useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
    Pressable,
    Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 40;

type Category = {
    id: string;
    title: string;
    description: string;
    color: string;
};

const categories: Category[] = [
    {
        id: "traffic",
        title: "Дорожні знаки",
        description: "Дорожні знаки, світлофори, перешкоди тощо",
        color: "#1E90FF",
    },
    {
        id: "damage",
        title: "Пошкодження дороги",
        description: "Ямки, тріщини, зсуви, просідання тощо",
        color: "#FF6B6B",
    },
];

const updates = [
    {
        id: 1,
        title: "Новий режим сканування",
        description: "Покращене комп'ютерне бачення для складних погодних умов",
    },
    {
        id: 2,
        title: "Випуск нової моделі",
        description: "Модель, яка сканує дорожні роботи та затори",
    },
];

export default function HomeScreen() {
    const router = useRouter();
    const segments = useSegments();
    const [activeIndex, setActiveIndex] = useState(0);
    const [activeTab, setActiveTab] = useState<string>("index");

    // animated scale values for each tab
    const scalesRef = useRef({
        index: new Animated.Value(1),
        road: new Animated.Value(1),
        map: new Animated.Value(1),
        settings: new Animated.Value(1),
    });

    useEffect(() => {
        // determine active tab from route segments
        if (!segments) {
            setActiveTab("index");
        } else {
            const last = segments[segments.length - 1];
            if (last === "road") setActiveTab("road");
            else if (last === "map") setActiveTab("map");
            else if (last === "settings") setActiveTab("settings");
            else setActiveTab("index");
        }
    }, [segments]);

    // animate scales when activeTab changes
    useEffect(() => {
        const keys = ["index", "road", "map", "settings"] as const;
        const animations: Animated.CompositeAnimation[] = [];
        keys.forEach((k) => {
            const toValue = k === activeTab ? 1.06 : 1;
            animations.push(
                Animated.timing(scalesRef.current[k], {
                    toValue,
                    duration: 180,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                })
            );
        });
        Animated.parallel(animations).start();
    }, [activeTab]);

    const handleCategoryPress = (categoryId: string) => {
        if (categoryId === "traffic") {
            router.push("/map");
        } else if (categoryId === "damage") {
            router.push("/road");
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>EasyRoad</Text>
                    <Text style={styles.subtitle}>Що оберете сьогодні?</Text>
                    <Text style={styles.description}>Виберіть категорію, яку хочете сканувати з EasyRoad</Text>
                </View>

                {/* Carousel */}
                <View style={styles.carouselContainer}>
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        scrollEventThrottle={16}
                        onMomentumScrollEnd={(event) => {
                            const slide = Math.round(event.nativeEvent.contentOffset.x / CARD_WIDTH);
                            setActiveIndex(slide);
                        }}
                    >
                        {categories.map((category, index) => (
                            <Pressable key={category.id} style={styles.cardWrapper} onPress={() => handleCategoryPress(category.id)}>
                                <View
                                    style={[
                                        styles.card,
                                        {
                                            backgroundColor: category.color
                                        }
                                    ]}
                                >
                                    <View style={styles.cardContent}>
                                        <Text style={styles.cardTitle}>{category.title}</Text>
                                        <Text style={styles.cardDescription}>{category.description}</Text>
                                    </View>
                                </View>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>

                {/* Carousel Indicators removed - active card will be green */}

                {/* Follow Our Updates */}
                <View style={styles.updatesSection}>
                    <Text style={styles.updatesTitle}>Слідкуйте за оновленнями</Text>

                    {updates.map((update) => (
                        <View key={update.id} style={styles.updateCard}>
                            <View style={styles.updateIconContainer}>
                                <Ionicons name="notifications" size={32} color="#4CAF50" />
                            </View>
                            <View style={styles.updateContent}>
                                <Text style={styles.updateItemTitle}>{update.title}</Text>
                                <Text style={styles.updateItemDescription}>{update.description}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* Bottom Navigation (custom) */}
            <View style={styles.bottomNav}>
                <Animated.View style={{ transform: [{ scale: scalesRef.current.index }] }}>
                    <Pressable
                        onPress={() => {
                            router.push("/");
                        }}
                        style={[styles.navItem, activeTab === "index" ? styles.navItemActive : null]}
                    >
                        <Ionicons name="home" size={20} color={activeTab === "index" ? "#1a1a2e" : "#fff"} />
                        {activeTab === "index" && <Text style={styles.navLabelActive}>Головна</Text>}
                    </Pressable>
                </Animated.View>

                <Animated.View style={{ transform: [{ scale: scalesRef.current.road }] }}>
                    <Pressable
                        onPress={() => {
                            router.push("/road");
                        }}
                        style={[styles.navItemCircle, activeTab === "road" ? styles.navItemCircleActive : null]}
                    >
                        <Ionicons name="car-sport" size={20} color={activeTab === "road" ? "#1a1a2e" : "#fff"} />
                        {activeTab === "road" && <Text style={styles.navLabelActive}>Дорога</Text>}
                    </Pressable>
                </Animated.View>

                <Animated.View style={{ transform: [{ scale: scalesRef.current.map }] }}>
                    <Pressable
                        onPress={() => {
                            router.push("/map");
                        }}
                        style={[styles.navItemCircle, activeTab === "map" ? styles.navItemCircleActive : null]}
                    >
                        <Ionicons name="locate" size={20} color={activeTab === "map" ? "#1a1a2e" : "#fff"} />
                        {activeTab === "map" && <Text style={styles.navLabelActive}>Карта</Text>}
                    </Pressable>
                </Animated.View>

                <Animated.View style={{ transform: [{ scale: scalesRef.current.settings }] }}>
                    <Pressable
                        onPress={() => {
                            router.push("/settings");
                        }}
                        style={[styles.navItemCircle, activeTab === "settings" ? styles.navItemCircleActive : null]}
                    >
                        <Ionicons name="settings" size={20} color={activeTab === "settings" ? "#1a1a2e" : "#fff"} />
                        {activeTab === "settings" && <Text style={styles.navLabelActive}>Налаштування</Text>}
                    </Pressable>
                </Animated.View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        color: "#666",
        lineHeight: 20,
    },
    carouselContainer: {
        height: 260,
    },
    cardWrapper: {
        width: CARD_WIDTH,
        paddingHorizontal: 20,
        justifyContent: "center",
    },
    card: {
        borderRadius: 16,
        padding: 20,
        justifyContent: "flex-end",
        minHeight: 200,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    cardContent: {
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderRadius: 12,
        padding: 16,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 6,
    },
    cardDescription: {
        fontSize: 13,
        color: "#666",
        lineHeight: 18,
    },
    /* carousel indicators removed */
    updatesSection: {
        paddingHorizontal: 20,
    },
    updatesTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
        marginBottom: 16,
    },
    updateCard: {
        flexDirection: "row",
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    updateIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 8,
        backgroundColor: "#e8f5e9",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    updateContent: {
        flex: 1,
        justifyContent: "center",
    },
    updateItemTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#333",
        marginBottom: 4,
    },
    updateItemDescription: {
        fontSize: 12,
        color: "#666",
        lineHeight: 16,
    },
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
    navItemActive: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        paddingHorizontal: 22,
        backgroundColor: "#4CAF50",
        borderRadius: 28,
        flexDirection: "row",
        gap: 8,
        minWidth: 120,
    },
    navItem: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        paddingHorizontal: 8,
    },
    navItemCircle: {
        width: 50,
        height: 50,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#172033",
        borderRadius: 50,
    },
    navItemCircleActive: {
        width: 50,
        height: 50,
        backgroundColor: "#4CAF50",
        borderRadius: 25,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
        elevation: 3,
    },
    navLabel: {
        fontSize: 11,
        color: "#999",
        marginTop: 4,
    },
    navLabelActive: {
        fontSize: 14,
        color: "#1a1a2e",
        fontWeight: "700",
    },
});
