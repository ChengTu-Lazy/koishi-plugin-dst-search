import { DetailInfoProvider, DetailInfo } from "../modules/detailinfo-module";
import { Context } from "koishi";

export class DbDetailInfoProvider extends DetailInfoProvider {
    async getDetailInfosAsync(ctx: Context, rowId: string, Token: string): Promise<JSON> {
        let dbDetailInfo = await ctx.database.get('dstinfo', { name: "DetailInfo" })

        if (JSON.stringify(dbDetailInfo).toString() == '[]') {
            let detailinfo = new DetailInfo()
            await detailinfo.updateDetailInfoAsync(ctx, Token)
            dbDetailInfo = await ctx.database.get('dstinfo', { id: 3 })
        }

        let dbDetailInfoJson = dbDetailInfo[0].info
        let dbDetailInfoArray = JSON.parse(JSON.stringify(dbDetailInfoJson))
        let result: JSON
        for (let index = 0; index < dbDetailInfoArray.length; index++) {
            if (JSON.stringify(dbDetailInfoArray[index]).includes(rowId)) {
                result = dbDetailInfoJson[index]
            }
        }
        return result
    }
}