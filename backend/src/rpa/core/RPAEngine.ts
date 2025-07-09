// backend/src/rpa/core/RPAEngine.ts - 更新版本
import { PlatformType } from '../../core/types/platform';
import { RPAExecutor } from './RPAExecutor';
import { RPATaskConfig, RPAExecutionResult } from '../types/rpa';

export class RPAEngine {
    private executor: RPAExecutor;
    private supportedPlatforms: Set<PlatformType> = new Set();

    constructor() {
        this.executor = new RPAExecutor();
    }

    async initialize() {
        await this.executor.initialize();
        await this.loadSupportedPlatforms();
    }

    private async loadSupportedPlatforms() {
        const { promises: fs } = await import('fs');
        const path = await import('path');

        try {
            const scriptsPath = path.join(process.cwd(), 'rpa-scripts');
            const files = await fs.readdir(scriptsPath);

            for (const file of files) {
                if (file.endsWith('.js')) {
                    const platformId = file.replace('.js', '') as PlatformType;
                    this.supportedPlatforms.add(platformId);
                }
            }

            console.log(`✅ RPA Engine supports ${this.supportedPlatforms.size} platforms`);
        } catch (error) {
            console.error('❌ Failed to load supported platforms:', error);
        }
    }

    async execute(config: {
        platformId: PlatformType;
        content: any;
        accountFile: string;
        options?: any;
    }): Promise<RPAExecutionResult> {
        const { platformId, content, accountFile } = config;

        if (!this.supportedPlatforms.has(platformId)) {
            throw new Error(`Platform ${platformId} not supported by RPA engine`);
        }

        // 转换为RPA任务配置
        const rpaConfig: RPATaskConfig = {
            videoPath: content.videoPath || content.videoFile,
            videoFileName: content.videoFileName || content.filename,
            videoMime: content.videoMime || content.mimeType || 'video/mp4',
            title: content.title || '',
            description: content.description || content.content || '',
            tabId: `tab_${Date.now()}`,
            locationKeyword: content.location || content.locationKeyword
        };

        return await this.executor.executeRPAScript(
            platformId,
            rpaConfig,
            accountFile
        );
    }

    getSupportedPlatforms(): PlatformType[] {
        return Array.from(this.supportedPlatforms);
    }

    isPlatformSupported(platform: PlatformType): boolean {
        return this.supportedPlatforms.has(platform);
    }

    async cleanup() {
        await this.executor.cleanup();
    }
}