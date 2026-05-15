import React, { useEffect, useState } from "react";
import { View, StyleSheet, StatusBar, ActivityIndicator, Text } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE } from "../constants/config";

type MarkerItem = {
    id: string | number;
    latitude: number;
    longitude: number;
    title?: string;
    description?: string;
    severity?: number;
};

export default function MapScreen() {
    const [markers, setMarkers] = useState<MarkerItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [region, setRegion] = useState({
        latitude: 50.4501,
        longitude: 30.5234,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
    });

    useEffect(() => {
        const fetchMarkers = async () => {
            setLoading(true);
            setError(null);

            // Backend should expose an endpoint that returns an array of markers:
            // [{ id, latitude, longitude, title, description, severity }]
            const url = `${API_BASE}/markers`;

            try {
                const res = await fetch(url);
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }

                const data = await res.json();

                // Basic validation / normalization
                const normalized: MarkerItem[] = Array.isArray(data)
                    ? data.map((m: any, i: number) => ({
                          id: m.id ?? i,
                          latitude: Number(m.latitude),
                          longitude: Number(m.longitude),
                          title: m.title ?? "",
                          description: m.description ?? "",
                          severity: m.severity ?? 0,
                      }))
                    : [];

                setMarkers(normalized);

                if (normalized.length > 0) {
                    const first = normalized[0];
                    setRegion((r) => ({ ...r, latitude: first.latitude, longitude: first.longitude }));
                }

            } catch (err: any) {
                console.warn("Failed to load markers:", err);
                setError(err?.message ?? "Failed to load markers");
            } finally {
                setLoading(false);
            }
        };

        fetchMarkers();
    }, []);

    return (
        <SafeAreaView style={styles.screen}>
            <StatusBar barStyle="dark-content" />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" />
                    <Text style={styles.hint}>Loading map markers…</Text>
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Text style={styles.error}>Could not load markers: {error}</Text>
                </View>
            ) : (
                <MapView
                    style={styles.map}
                    provider={PROVIDER_GOOGLE}
                    initialRegion={region}
                    showsUserLocation={true}
                >
                    {markers.map((m) => (
                        <Marker
                            key={String(m.id)}
                            coordinate={{ latitude: m.latitude, longitude: m.longitude }}
                            title={m.title}
                            description={m.description}
                            pinColor={m.severity && m.severity > 0 ? "red" : "orange"}
                        />
                    ))}
                </MapView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#F5F5F7",
    },
    map: {
        flex: 1,
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    hint: {
        marginTop: 8,
        color: "#666",
    },
    error: {
        color: "#B00020",
        paddingHorizontal: 16,
        textAlign: "center",
    },
});
