require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai'); // 确保导入正确

const app = express();
const port = 3000;

// 1. 中间件
app.use(cors());
app.use(express.json()); // 解析 JSON 请求体

// 2. 调试中间件：打印每个请求的 body
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] 收到 ${req.method} ${req.url}`);
    console.log('请求体:', req.body);
    next();
});

// 3. 初始化 OpenAI (CloseAI) 客户端
console.log('环境变量 CLOSEAI_API_KEY 是否存在:', !!process.env.CLOSEAI_API_KEY);
if (!process.env.CLOSEAI_API_KEY) {
    console.error('❌ 错误：CLOSEAI_API_KEY 环境变量未设置！');
    process.exit(1); // 退出进程，避免后续调用出错
}

const openai = new OpenAI({
    apiKey: process.env.CLOSEAI_API_KEY,
    baseURL: 'https://api.openai-proxy.org/v1',
});

console.log('✅ openai 客户端初始化成功');

// 4. 路由定义
app.post('/api/chat', async (req, res) => {
    const { activity } = req.body;

    if (!activity) {
        return res.status(400).json({ error: '缺少活动名称' });
    }

    try {
        console.log(`正在为活动 "${activity}" 生成攻略...`);
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo', // 如果失败可尝试 'deepseek-chat' 或其他
            messages: [
                { role: 'system', content: '你是一个浪漫的约会策划师，为情侣提供详细、有趣、温馨的约会攻略。' },
                { role: 'user', content: `请为情侣约会活动“${activity}”写一份详细的攻略，包括时间安排、地点推荐、注意事项、浪漫小贴士等。` }
            ],
            temperature: 0.7,
            max_tokens: 800,
        });

        const strategy = completion.choices[0].message.content;
        console.log('✅ 攻略生成成功');
        res.json({ content: strategy });
    } catch (error) {
        console.error('❌ 调用 CloseAI 失败:');
        console.error('错误名称:', error.name);
        console.error('错误消息:', error.message);
        if (error.response) {
            console.error('状态码:', error.response.status);
            console.error('响应数据:', error.response.data);
        }
        console.error('完整错误对象:', error);
        res.status(500).json({ error: 'AI 生成失败，请查看服务器日志' });
    }
});

// 5. 启动服务器
app.listen(port, () => {
    console.log(`🚀 代理服务器运行在 http://localhost:${port}`);
});