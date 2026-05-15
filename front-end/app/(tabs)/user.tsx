import React from "react";
import { View, ScrollView, StatusBar, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UserTabScreen() {
    return (
        <SafeAreaView style={styles.screen}>
            <StatusBar barStyle="dark-content" />
            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
            >
                <View style={styles.content}>
                    {/* User profile content goes here */}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#F5F5F7",
    },
    scroll: {
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 18,
    },
    content: {
        flex: 1,
    },
});
