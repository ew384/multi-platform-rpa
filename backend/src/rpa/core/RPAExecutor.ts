// backend/src/rpa/core/RPAExecutor.ts
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class RPAExecutor {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private page: Page | null = null;
    private scriptsPath: string;

    constructor() {
        this.scriptsPath = path.join(process.cwd(), 'rpa-scripts');
    }

    async initialize() {
        this.browser = await chromium.launch({
            headless: false, // RPA脚本需要真实浏览器环境
            args: ['--disable-blink-features=AutomationControlled']
        });

        this.context = await this.browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        });

        this.page = await this.context.newPage();

        // 注入window.api模拟对象
        await this.injectAPIBridge();
    }

    private async injectAPIBridge() {
        if (!this.page) return;

        // 模拟window.api.invoke方法
        await this.page.addInitScript(() => {
            (window as any).api = {
                invoke: async (method: string, ...args: any[]) => {
                    console.log(`API调用: ${method}`, args);

                    switch (method) {
                        case 'readFileBuffer':
                            const filePath = args[0];
                            // 这里需要实际读取文件并返回Uint8Array
                            return fetch(`/api/file-buffer?path=${encodeURIComponent(filePath)}`)
                                .then(res => res.arrayBuffer())
                                .then(buffer => new Uint8Array(buffer));

                        case 'rpa-send-event':
                            const [value, tabId, serviceId] = args;
                            // 模拟输入事件
                            return Promise.resolve();

                        case 'rpa-send-entry-event':
                            const [entryTabId, entryServiceId] = args;
                            // 模拟回车事件
                            return Promise.resolve();

                        default:
                            return Promise.resolve();
                    }
                }
            };
        });
    }

    async executeRPAScript(
        platformId: string,
        config: RPATaskConfig,
        cookieFile: string
    ): Promise<RPAExecutionResult> {
        const startTime = Date.now();

        try {
            if (!this.page) {
                throw new Error('RPA Executor not initialized');
            }

            // 1. 加载Cookie
            await this.loadCookies(cookieFile);

            // 2. 导航到平台页面
            await this.navigateToPlatform(platformId);

            // 3. 注入RPA脚本
            await this.injectRPAScript(platformId);

            // 4. 设置全局配置
            await this.setGlobalConfig(config);

            // 5. 执行RPA脚本
            const result = await this.runRPAScript();

            return {
                success: true,
                duration: Date.now() - startTime
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                duration: Date.now() - startTime
            };
        }
    }

    private async loadCookies(cookieFile: string) {
        if (!this.context) return;

        try {
            const cookieData = await fs.readFile(cookieFile, 'utf-8');
            const cookies = JSON.parse(cookieData);

            // 假设cookie格式与Playwright兼容
            await this.context.addCookies(cookies);
            console.log(`✅ Loaded cookies from ${cookieFile}`);
        } catch (error) {
            console.error('❌ Failed to load cookies:', error);
        }
    }

    private async navigateToPlatform(platformId: string) {
        if (!this.page) return;

        const platformUrls = {
            'douyin': 'https://creator.douyin.com/creator-micro/content/upload',
            'kuaishou': 'https://cp.kuaishou.com/article/publish/video',
            'bilibili': 'https://member.bilibili.com/v2#/upload/video/frame',
            'weibo': 'https://weibo.com/compose/',
            'zhihu': 'https://zhuanlan.zhihu.com/write'
            // ... 其他平台URL
        };

        const url = platformUrls[platformId];
        if (!url) {
            throw new Error(`Unknown platform: ${platformId}`);
        }

        await this.page.goto(url);
        await this.page.waitForLoadState('domcontentloaded');
        console.log(`✅ Navigated to ${platformId}: ${url}`);
    }

    private async injectRPAScript(platformId: string) {
        if (!this.page) return;

        const scriptPath = path.join(this.scriptsPath, `${platformId}.js`);

        try {
            const scriptContent = await fs.readFile(scriptPath, 'utf-8');

            // 注入RPA脚本到页面
            await this.page.addScriptTag({
                content: scriptContent
            });

            console.log(`✅ Injected RPA script for ${platformId}`);
        } catch (error) {
            throw new Error(`Failed to inject RPA script: ${error.message}`);
        }
    }

    private async setGlobalConfig(config: RPATaskConfig) {
        if (!this.page) return;

        // 设置全局变量
        await this.page.evaluate((config) => {
            (window as any).serviceId = config.tabId;
            (window as any).isDone = false;
            (window as any).rpConfig = config;
        }, config);
    }

    private async runRPAScript(): Promise<void> {
        if (!this.page) return;

        // 执行RPA脚本的主要流程
        return new Promise(async (resolve, reject) => {
            try {
                // 1. 先执行视频上传
                await this.page.evaluate(async (config) => {
                    if (typeof renderVideo === 'function') {
                        await renderVideo(config);
                    }
                }, await this.page.evaluate(() => (window as any).rpConfig));

                // 2. 等待视频上传完成并执行表单填写
                let attempts = 0;
                const maxAttempts = 60; // 最多等待60秒

                const checkAndRender = async () => {
                    try {
                        const isDone = await this.page.evaluate(async (config) => {
                            if (typeof render === 'function') {
                                await render(config);
                            }
                            return (window as any).isDone;
                        }, await this.page.evaluate(() => (window as any).rpConfig));

                        if (isDone) {
                            // 3. 执行发布
                            await this.page.evaluate(() => {
                                if (typeof startPush === 'function') {
                                    startPush();
                                }
                            });

                            resolve();
                        } else if (attempts < maxAttempts) {
                            attempts++;
                            setTimeout(checkAndRender, 1000);
                        } else {
                            reject(new Error('RPA execution timeout'));
                        }
                    } catch (error) {
                        reject(error);
                    }
                };

                await checkAndRender();

            } catch (error) {
                reject(error);
            }
        });
    }

    async cleanup() {
        if (this.context) {
            await this.context.close();
        }
        if (this.browser) {
            await this.browser.close();
        }
    }
}