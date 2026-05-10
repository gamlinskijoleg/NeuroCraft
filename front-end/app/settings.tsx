import Ionicons from "@expo/vector-icons/build/Ionicons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsTabScreen() {
    const router = useRouter();
    return (
        <SafeAreaView style={styles.screen}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={true}>
                <StatusBar barStyle="dark-content" />
                {/* Header */}
                <View style={styles.headerContainer}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#1A2343" />
                    </Pressable>
                    <Text style={styles.brand}>Налаштування</Text>
                    <View style={{ width: 40 }} />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16
    },
    scroll: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 18 },

    backButton: {
        padding: 8
    },
    brand: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1A2343"
    },

    screen: {
        flex: 1,
        backgroundColor: "#F5F5F7",
        padding: 16
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7F0",
        padding: 14
    },
    title: {
        color: "#1A2343",
        fontSize: 16,
        fontWeight: "700"
    },
    text: {
        marginTop: 6,
        color: "#7C8199",
        fontSize: 13
    }
});
