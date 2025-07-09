export interface RPATaskConfig {
    videoPath: string;
    videoFileName: string;
    videoMime: string;
    title: string;
    description: string;
    tabId: string;
    locationKeyword?: string;
}

export interface RPAGlobalContext {
    serviceId: string;
    isDone: boolean;
    renderTaskMap: Record<string, number>;
}

export interface RPAExecutionResult {
    success: boolean;
    error?: string;
    duration: number;
    screenshots?: string[];
}