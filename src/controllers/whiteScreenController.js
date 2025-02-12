const { transformData } = require('../utils/whiteScreenTransform');
const influxService = require('../services/influxService');

class WhiteScreenController {
    async reportWhiteScreen(ctx) {
        try {
            const { pageUrl } = ctx.request.body;
            const addCount = 1; 
            const point = transformData({ pageUrl, addCount }, ctx.state);

            await influxService.writePoints([point]);
            ctx.status = 201;
            ctx.body = { success: true };
        } catch (err) {
            ctx.status = 500;
            ctx.body = { error: '服务器内部错误,上传白屏时长数据失败' };
            console.error('保存白屏时长数据失败:', err);
        }
    }

    async getWhiteScreen(ctx) {
        try {
            const pageUrl = ctx.query.pageUrl;
            const rangeTime = ctx.query.rangeTime ||7;
            // 检查参数是否有效
            if (!pageUrl) {
                ctx.status = 400;
                ctx.body = { error: '缺少必要白屏查询参数pageUrl或参数格式错误！' };
                return;
            }
            let query;
            if (pageUrl === 'total') {
                // 当 pageUrl 为 'total' 时，去掉 group 条件
                query = `
                    from(bucket: "monitor data")
                      |> range(start: -${parseInt(rangeTime)}d)
                      |> filter(fn: (r) => r._measurement == "WhiteScreen")
                      |> sum(column: "_value")
                `;
            } else {
                // 正常情况，保留 group 条件
                query = `
                    from(bucket: "monitor data")
                      |> range(start: -${parseInt(rangeTime)}d)
                      |> filter(fn: (r) => r._measurement == "WhiteScreen" and r.pageUrl == "${pageUrl}")
                      |> group(columns: ["pageUrl"])
                      |> sum(column: "_value")
                `;
            }
            console.log('执行的查询语句:', query);
            const data = await influxService.queryData(query);
            console.log('data:', data);
            ctx.body = { success: true, data };
        } catch (err) {
            ctx.status = 500;
            ctx.body = { error: '查询白屏时长数据失败' };
            console.error('查询白屏时长数据错误:', err);
        }
    }
}

module.exports = new WhiteScreenController();