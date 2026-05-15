import { useRouter } from "expo-router";
import React from "react";
import { View, StyleSheet, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MapScreen() {
    return (
        <SafeAreaView style={styles.screen}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.content}>{/* Map content goes here */}</View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#F5F5F7",
    },
    content: {
        flex: 1,
    },
});
