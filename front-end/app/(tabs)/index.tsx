import { useRouter, useSegments } from "expo-router";
import React, { useState, useEffect } from "react";
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
        id: "signs",
        title: "Дорожні знаки",
        description: "Дорожні знаки, світлофори, перешкоди тощо",
        color: "#1E90FF",
    },
    {
        id: "road",
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

    const handleCategoryPress = (categoryId: string) => {
        if (categoryId === "signs") {
            router.push("../signs");
        } else if (categoryId === "road") {
            router.push("../road");
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
                    <Text style={styles.description}>
                        Виберіть категорію, яку хочете сканувати з EasyRoad
                    </Text>
                </View>

                {/* Carousel */}
                <View style={styles.carouselContainer}>
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        scrollEventThrottle={16}
                    >
                        {categories.map((category, index) => (
                            <Pressable
                                key={category.id}
                                style={styles.cardWrapper}
                                onPress={() => handleCategoryPress(category.id)}
                            >
                                <View
                                    style={[
                                        styles.card,
                                        {
                                            backgroundColor: category.color,
                                        },
                                    ]}
                                >
                                    <View style={styles.cardContent}>
                                        <Text style={styles.cardTitle}>
                                            {category.title}
                                        </Text>
                                        <Text style={styles.cardDescription}>
                                            {category.description}
                                        </Text>
                                    </View>
                                </View>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>

                {/* Carousel Indicators removed - active card will be green */}

                {/* Follow Our Updates */}
                <View style={styles.updatesSection}>
                    <Text style={styles.updatesTitle}>
                        Слідкуйте за оновленнями
                    </Text>

                    {updates.map((update) => (
                        <View key={update.id} style={styles.updateCard}>
                            <View style={styles.updateIconContainer}>
                                <Ionicons
                                    name="notifications"
                                    size={32}
                                    color="#4CAF50"
                                />
                            </View>
                            <View style={styles.updateContent}>
                                <Text style={styles.updateItemTitle}>
                                    {update.title}
                                </Text>
                                <Text style={styles.updateItemDescription}>
                                    {update.description}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         backgroundColor: "#F5F5F7",
//     },
//     header: {
//         paddingHorizontal: 20,
//         paddingVertical: 24,
//     },
//     title: {
//         fontSize: 32,
//         fontWeight: "700",
//         color: "#1a1a2e",
//         marginBottom: 8,
//     },
//     subtitle: {
//         fontSize: 18,
//         fontWeight: "600",
//         color: "#1a1a2e",
//         marginBottom: 4,
//     },
//     description: {
//         fontSize: 14,
//         color: "#666",
//         lineHeight: 20,
//     },
//     carouselContainer: {
//         height: 260,
//         marginVertical: 20,
//     },
//     cardWrapper: {
//         width: CARD_WIDTH,
//         marginLeft: 20,
//         marginRight: 20,
//     },
//     card: {
//         borderRadius: 16,
//         overflow: "hidden",
//         height: 220,
//         justifyContent: "space-between",
//         padding: 20,
//     },
//     cardContent: {
//         flex: 1,
//         justifyContent: "space-between",
//     },
//     cardTitle: {
//         fontSize: 22,
//         fontWeight: "700",
//         color: "white",
//         marginBottom: 8,
//     },
//     cardDescription: {
//         fontSize: 14,
//         color: "rgba(255,255,255,0.9)",
//         lineHeight: 20,
//     },
//     cardFooter: {
//         marginTop: 12,
//     },
//     cardButton: {
//         backgroundColor: "rgba(255,255,255,0.2)",
//         paddingHorizontal: 16,
//         paddingVertical: 8,
//         borderRadius: 8,
//         alignSelf: "flex-start",
//     },
//     cardButtonText: {
//         color: "white",
//         fontWeight: "600",
//         fontSize: 14,
//     },
//     dotsContainer: {
//         flexDirection: "row",
//         justifyContent: "center",
//         gap: 6,
//         marginVertical: 16,
//     },
//     dot: {
//         borderRadius: 4,
//     },
//     updatesSection: {
//         paddingHorizontal: 20,
//         paddingVertical: 20,
//     },
//     updateTitle: {
//         fontSize: 18,
//         fontWeight: "700",
//         color: "#1a1a2e",
//         marginBottom: 12,
//     },
//     updateCard: {
//         flexDirection: "row",
//         backgroundColor: "white",
//         borderRadius: 12,
//         padding: 12,
//         marginBottom: 12,
//         gap: 12,
//         shadowColor: "#000",
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.08,
//         shadowRadius: 4,
//         elevation: 2,
//     },
//     updateContent: {
//         flex: 1,
//     },
//     updateCardTitle: {
//         fontSize: 14,
//         fontWeight: "600",
//         color: "#1a1a2e",
//         marginBottom: 4,
//     },
//     updateCardDescription: {
//         fontSize: 12,
//         color: "#666",
//         lineHeight: 16,
//     },
// });
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
});
