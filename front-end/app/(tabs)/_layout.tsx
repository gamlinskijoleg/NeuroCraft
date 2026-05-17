import { Tabs } from "expo-router";
import { View } from "react-native";
import BottomNavigation from "../../src/components/BottomNavigation";

export default function TabsLayout() {
    return (
        <View style={{ flex: 1 }}>
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarStyle: { display: "none" },
                }}
            >
                <Tabs.Screen
                    name="index"
                    options={{
                        title: "Головна",
                    }}
                />
                <Tabs.Screen
                    name="map"
                    options={{
                        title: "Карта",
                    }}
                />
                <Tabs.Screen
                    name="goals"
                    options={{
                        title: "Цілі",
                    }}
                />
                <Tabs.Screen
                    name="user"
                    options={{
                        title: "Профіль",
                    }}
                />
            </Tabs>
            <BottomNavigation />
        </View>
    );
}
