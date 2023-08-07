import { Context } from "koishi";
import { DetailInfoProvider, ApiDetailInfoProvider, DbDetailInfoProvider } from "../modules/detailinfo-module";
import { GetDetailSendInfoAsync } from "../utls/get-detail-sendinfo-async"

export class DetailInfo {
    async getDetailInfoAsync(ctx: Context, token: string, userId: string, index: number): Promise<JSON> {
        let detailInfoProvider: DetailInfoProvider
        let simpleInfoJson = await ctx.database.get('dstinfo', { name: "SimpleInfo" })
        let rowIdArray = (await ctx.database.get('dstinfo', { name: userId }))[0].info
        let length = JSON.parse(JSON.stringify(rowIdArray)).length
        if (length == 0) {
            return JSON.parse(`{"error":"请先查询服务器"}`)
        }
        if (index > length || index <= 0) {
            return JSON.parse(`{"error":"不在可选范围，当前可查${length}个服务器"}`)
        }
        let rowId = rowIdArray[index - 1]
        if (JSON.stringify(simpleInfoJson).includes(rowId)) {
            detailInfoProvider = new DbDetailInfoProvider()
        } else {
            detailInfoProvider = new ApiDetailInfoProvider()
        }
        return await detailInfoProvider.getDetailInfosAsync(ctx, rowId, token)
    }

    async updateDetailInfoAsync(ctx: Context, token: string): Promise<void> {
        let detailInfoProvider = new ApiDetailInfoProvider()
        let simpleInfoJson = (await ctx.database.get('dstinfo', { name: "SimpleInfo" }))[0].info
        const simpleinfo = JSON.parse(JSON.stringify(simpleInfoJson));
        let rowIdArray = []
        simpleinfo.map((item) => {
            const { rowId } = item;
            rowIdArray.push(rowId)
        })
        let detailInfo = []
        for (let rowId of rowIdArray) {
            detailInfo.push(await detailInfoProvider.getDetailInfosAsync(ctx, rowId, token))
        }
        detailInfo = detailInfo.flat()
        detailInfoProvider.setDetailInfosAsync(ctx, JSON.parse(JSON.stringify(detailInfo)))
    }

    async getMessageAsync(json: JSON): Promise<string> {
        if (JSON.stringify(json) !== "[]") {
            let res = await GetDetailSendInfoAsync(json)
            return res
        }
        else {
            return "未找到该服务器！"
        }
    }

    async getImageAsync(ctx: Context, str: string) {
        try {
            let res = await ctx.puppeteer.render(
                `
                <!DOCTYPE html>
                <html lang="en">
                
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <script src="https://cdn.tailwindcss.com"></script>
                </head>
                
                <body class="bg-gray-100 text-black" style="width: 450px">
                    <div class="mx-auto px-4 max-w-400 w-auto bg-white p-4">
                        <div>
                            <div class="font-bold">${str.replace(/\n/g, '<br>')}</div>
                        </div>
                    </div>
                </body>
                
                </html>
                `
            )
            return res
        } catch (error) {
            return "请检查puppeteer服务是否正确开启，图画转换功能依赖于此插件！"
        }
    }
}

