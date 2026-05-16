export type ApiDetection = {
    class_name?: string;
    confidence: number;
    bbox?:
        | number[]
        | { x: number; y: number; w: number; h: number }
        | { x1: number; y1: number; x2: number; y2: number };
};

export type ApiSingleResponse = {
    success: boolean;
    message: string;
    detections?: ApiDetection[];
    model_used?: string;
    processing_time?: number;
};

export type DetectionScreenConfig = {
    title: string;
    description: string;
    endpoint: string;
    defaultClassName: string;
    scanButtonColor: string;
    bboxColor: { border: string; bg: string };
    descriptionBgColor: string;
};
