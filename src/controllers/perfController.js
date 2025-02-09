const { transformData } = require('../utils/dataTransformer');
const influxService = require('../services/influxService');

class PerfController {
    async report(ctx) {
        try {
            const { performance } = ctx.request.body;
            if (!performance?.ttfb || !performance?.lcpRenderTime || !performance?.fcpStartTime) {
                ctx.status = 400;
                ctx.body = { error: '缺少关键性能指标（TTFB/LCP/FCP）！' };
                return;
            }

            const points = transformData({ performance }, ctx.state);
            await influxService.writePoints(points);

            ctx.status = 201;
            ctx.body = { success: true };
        } catch (err) {
            ctx.status = 500;
            ctx.body = { error: '服务器内部错误' };
            console.error('上报失败:', err);
        }
    }

    async getPerformance(ctx) {
        try {
            const limit = parseInt(ctx.query.limit) || 100;
            const query = `
        from(bucket: "monitor data")
          |> range(start: -30d)
          |> filter(fn: (r) => r._measurement == "web_perf")
          |> sort(columns: ["_time"], desc: true)
          |> limit(n: ${limit})
      `;

            const data = await influxService.queryData(query);
            ctx.body = { success: true, data };
        } catch (err) {
            ctx.status = 500;
            ctx.body = { error: '查询失败' };
            console.error('查询错误:', err);
        }
    }

    async deletePerformance(ctx) {
        try {
            const timestamp = ctx.params.timestamp;
            await influxService.deleteData(timestamp);
            ctx.status = 200;
            ctx.body = { success: true };
        } catch (err) {
            ctx.status = 500;
            ctx.body = { error: '删除数据失败' };
            console.error('删除失败:', err);
        }
    }
}

module.exports = new PerfController();