import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    View,
    StyleSheet,
    StatusBar,
    Text,
} from "react-native";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE } from "../../src/constants/config";

type MarkerItem = {
    id: string | number;
    latitude: number;
    longitude: number;
    title?: string;
    description?: string;
    severity?: number;
};

type Region = {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
};

function buildMapHtml(region: Region, markers: MarkerItem[]) {
    const mapCenter = {
        lat: region.latitude,
        lng: region.longitude,
    };

    const markerData = JSON.stringify(markers);

    return `
<!doctype html>
<html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link
            rel="stylesheet"
            href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
            integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
            crossorigin=""
        />
        <style>
            html, body, #map {
                margin: 0;
                width: 100%;
                height: 100%;
                background: #eef2f7;
            }
            .leaflet-popup-content-wrapper {
                border-radius: 14px;
            }
            .marker-title {
                font: 600 14px/1.2 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0 0 4px;
            }
            .marker-desc {
                font: 400 12px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                color: #4b5563;
            }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
        <script>
            const map = L.map('map', { zoomControl: true }).setView([${mapCenter.lat}, ${mapCenter.lng}], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap contributors',
            }).addTo(map);

            const markers = ${markerData};

            markers.forEach((marker) => {
                const severity = Number(marker.severity || 0);
                const color = severity > 2 ? '#dc2626' : severity > 0 ? '#f59e0b' : '#2563eb';
                const icon = L.divIcon({
                    className: '',
                    html: '<div style="width:18px;height:18px;border-radius:50%;background:' + color + ';border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.25);"></div>',
                    iconSize: [18, 18],
                    iconAnchor: [9, 9],
                    popupAnchor: [0, -8],
                });

                const popupHtml = '<div>' +
                    '<p class="marker-title">' + (marker.title || 'Road marker') + '</p>' +
                    '<p class="marker-desc">' + (marker.description || 'No description provided') + '</p>' +
                    '</div>';

                L.marker([marker.latitude, marker.longitude], { icon })
                    .addTo(map)
                    .bindPopup(popupHtml);
            });

            if (markers.length > 0) {
                const group = L.featureGroup(markers.map((marker) => L.marker([marker.latitude, marker.longitude])));
                map.fitBounds(group.getBounds().pad(0.2));
            }
        </script>
    </body>
</html>`;
}

export default function MapScreen() {
    const [markers, setMarkers] = useState<MarkerItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [region, setRegion] = useState<Region>({
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
                    setRegion((r) => ({
                        ...r,
                        latitude: first.latitude,
                        longitude: first.longitude,
                    }));
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
                    <Text style={styles.error}>
                        Could not load markers: {error}
                    </Text>
                </View>
            ) : (
                <WebView
                    style={styles.map}
                    originWhitelist={["*"]}
                    source={{ html: buildMapHtml(region, markers) }}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={true}
                    mixedContentMode="always"
                />
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
