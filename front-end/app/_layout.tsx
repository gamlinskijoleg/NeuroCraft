import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function RootLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: {
                    backgroundColor: "#1E2444",
                    borderTopWidth: 0,
                    borderTopLeftRadius: 18,
                    borderTopRightRadius: 18,
                    height: 62,
                    marginHorizontal: 10,
                    marginBottom: 8,
                    position: "absolute",
                    display: "none",
                },
                sceneStyle: { backgroundColor: "#F5F5F7" },
                tabBarActiveTintColor: "#0F1330",
                tabBarInactiveTintColor: "#B9C0D8",
                tabBarActiveBackgroundColor: "#58D65C",
                tabBarIconStyle: {
                    marginTop: 10
                },
                tabBarItemStyle: {
                    marginVertical: 12,
                    marginHorizontal: 8,
                    borderRadius: 12
                }
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name="home" size={16} color={focused ? "#0F1330" : color} />
                    )
                }}
            />
            <Tabs.Screen
                name="road"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name="car-sport" size={16} color={focused ? "#0F1330" : color} />
                    )
                }}
            />
            <Tabs.Screen
                name="map"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name="locate" size={16} color={focused ? "#0F1330" : color} />
                    )
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name="settings" size={16} color={focused ? "#0F1330" : color} />
                    )
                }}
            />
        </Tabs>
    );
}
