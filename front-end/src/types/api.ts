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

export type GoalChallenge = {
    id: string;
    title: string;
    description: string;
    progress: number;
    target: number;
    accent: string;
    icon: string;
};

export type GoalAchievement = {
    id: string;
    title: string;
    description: string;
    accent: string;
    icon: string;
    unlocked: boolean;
};

export type GoalsResponse = {
    success: boolean;
    message: string;
    user: {
        id: string;
        email: string;
        username?: string | null;
        is_active: boolean;
        created_at: string;
    };
    challenges: GoalChallenge[];
    achievements: GoalAchievement[];
};
