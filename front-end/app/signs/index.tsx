import { API_ENDPOINTS } from "../constants/config";
import DetectionScreen from "../components/DetectionScreen";

export default function TrafficSignsScreen() {
    return (
        <DetectionScreen
            config={{
                title: "Дорожні знаки",
                description: "Розпізнавання та класифікація дорожніх знаків",
                endpoint: API_ENDPOINTS.CLASSIFY_SIGNS,
                defaultClassName: "Sign",
                scanButtonColor: "#1E90FF",
                bboxColor: {
                    border: "rgba(30,144,255,0.9)",
                    bg: "rgba(30,144,255,0.12)",
                },
                descriptionBgColor: "#E3F2FD",
            }}
        />
    );
}
