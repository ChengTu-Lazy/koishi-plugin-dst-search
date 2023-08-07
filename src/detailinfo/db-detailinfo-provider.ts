import { DetailInfoProvider } from "./detailinfo-provider";
import { Context } from "koishi";

export class DbDetailInfoProvider extends DetailInfoProvider {
    async getDetailInfosAsync(ctx: Context,rowId:string): Promise<JSON> {
        let dbDetailInfo =await ctx.database.get('dstinfo',{name:"DetailInfo"})
        let dbDetailInfoJson =  dbDetailInfo[0].info
        let dbDetailInfoArray = JSON.parse(JSON.stringify(dbDetailInfoJson))
        let result :JSON
        for (let index = 0; index < dbDetailInfoArray.length; index++) {
            if (JSON.stringify(dbDetailInfoArray[index]).includes(rowId)) {
                result = dbDetailInfoJson[index]
            }
        }
        return result
    }
}