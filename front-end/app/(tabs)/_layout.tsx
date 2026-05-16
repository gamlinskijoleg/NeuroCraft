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
                        title: "Home",
                    }}
                />
                <Tabs.Screen
                    name="map"
                    options={{
                        title: "Map",
                    }}
                />
                <Tabs.Screen
                    name="goals"
                    options={{
                        title: "Goals",
                    }}
                />
                <Tabs.Screen
                    name="user"
                    options={{
                        title: "User",
                    }}
                />
            </Tabs>
            <BottomNavigation />
        </View>
    );
}
