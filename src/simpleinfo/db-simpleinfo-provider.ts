import { SimpleInfoProvider } from "./simpleinfo-provider";
import { Context } from "koishi";
import { RegionInfo } from "../modules/regioninfo-module";

export class DbSimpleInfoProvider extends SimpleInfoProvider {
    async getSimpleInfosAsync(ctx: Context): Promise<JSON> {
        let dbSimpleInfo =await ctx.database.get('dstinfo',{name:"SimpleInfo"})
        let result =  dbSimpleInfo[0].info
        return result
    }
}