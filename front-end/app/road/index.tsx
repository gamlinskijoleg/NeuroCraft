import DetectionScreen from "../components/DetectionScreen";
import { API_ENDPOINTS } from "../constants/config";

export default function RoadDamageScreen() {
    return (
        <DetectionScreen
            config={{
                title: "Пошкодження дороги",
                description:
                    "Сканування ямок, тріщин та пошкоджень дорожнього покриття",
                endpoint: API_ENDPOINTS.DETECT_CRACKS,
                defaultClassName: "Crack",
                scanButtonColor: "#4CAF50",
                bboxColor: {
                    border: "rgba(76,175,80,0.9)",
                    bg: "rgba(76,175,80,0.12)",
                },
                descriptionBgColor: "#E8F5E9",
            }}
        />
    );
}
