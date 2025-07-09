// backend/src/publishers/factory.ts - 更新发布器工厂
import { PlatformType, PublishMethod } from '../core/types/platform';
import { PLATFORM_CONFIGS } from '../core/config/platforms';
import { RPAEngine } from '../rpa/core/RPAEngine';

// SAU方案发布器
import { DouyinPublisher } from './douyin/DouyinPublisher';
import { TencentPublisher } from './tencent/TencentPublisher';
import { KuaishouPublisher } from './kuaishou/KuaishouPublisher';
import { XiaohongshuPublisher } from './xiaohongshu/XiaohongshuPublisher';

export class PublisherFactory {
    private static rpaEngine: RPAEngine;

    static async initialize() {
        this.rpaEngine = new RPAEngine();
        await this.rpaEngine.initialize();
    }

    static createPublisher(platformType: PlatformType, cookieFile: string) {
        const config = PLATFORM_CONFIGS[platformType];

        if (!config) {
            throw new Error(`Unsupported platform: ${platformType}`);
        }

        switch (config.method) {
            case PublishMethod.SAU:
                return this.createSAUPublisher(platformType, cookieFile);

            case PublishMethod.RPA:
                return this.createRPAPublisher(platformType, cookieFile);

            default:
                throw new Error(`Unknown publish method: ${config.method}`);
        }
    }

    private static createSAUPublisher(platformType: PlatformType, cookieFile: string) {
        switch (platformType) {
            case PlatformType.DOUYIN:
                return new DouyinPublisher(cookieFile);
            case PlatformType.TENCENT:
                return new TencentPublisher(cookieFile);
            case PlatformType.KUAISHOU:
                return new KuaishouPublisher(cookieFile);
            case PlatformType.XIAOHONGSHU:
                return new XiaohongshuPublisher(cookieFile);
            default:
                throw new Error(`SAU publisher not implemented for: ${platformType}`);
        }
    }

    private static createRPAPublisher(platformType: PlatformType, cookieFile: string) {
        return {
            async publish(config: any) {
                return await this.rpaEngine.execute({
                    platformId: platformType,
                    content: config,
                    accountFile: cookieFile
                });
            }
        };
    }

    static async cleanup() {
        if (this.rpaEngine) {
            await this.rpaEngine.cleanup();
        }
    }
}