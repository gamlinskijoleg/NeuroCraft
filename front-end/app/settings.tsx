import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function SettingsTabScreen() {
    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.card}>
                <Text style={styles.title}>Settings</Text>
                <Text style={styles.text}>Settings placeholder.</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
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
