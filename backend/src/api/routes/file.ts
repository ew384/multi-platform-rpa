// backend/src/api/routes/file.ts - 文件服务API
import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';

const router = express.Router();

// 为RPA脚本提供文件缓冲区
router.get('/file-buffer', async (req, res) => {
    try {
        const filePath = req.query.path as string;

        if (!filePath || filePath.includes('..')) {
            return res.status(400).json({ error: 'Invalid file path' });
        }

        // 验证文件路径是否在允许的目录中
        const allowedDir = path.join(process.cwd(), 'storage', 'videos');
        const fullPath = path.resolve(allowedDir, filePath);

        if (!fullPath.startsWith(allowedDir)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const fileBuffer = await fs.readFile(fullPath);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.send(fileBuffer);

    } catch (error) {
        res.status(500).json({ error: 'Failed to read file' });
    }
});

export default router;