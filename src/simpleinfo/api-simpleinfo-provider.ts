import { SimpleInfoProvider } from "./simpleinfo-provider";
import { Context } from "koishi";
import { RegionInfo } from "../modules/regioninfo-module";

export class ApiSimpleInfoProvider extends SimpleInfoProvider {
    async getSimpleInfosAsync(ctx: Context, searchName: string): Promise<JSON> {
        let regionInfo = new RegionInfo();
        let regionsJson = await regionInfo.getRegionsAsync(ctx);
        let result: any[] = []
        for (const region of JSON.parse(JSON.stringify(regionsJson))) {
            const url = `https://lobby-v2-cdn.klei.com/${region}-Steam.json.gz`;
            const response = await ctx.http.get(url);
            const resultTemp = response.GET
                .filter((item: any) => item.name.includes(searchName))
                .map((item: any) => ({
                    name: item.name,
                    mode: item.intent,
                    rowId: item.__rowId,
                    season: item.season,
                    maxconnections: item.maxconnections,
                    connected: item.connected,
                    version: item.v,
                }));
            if (resultTemp.length !== 0) {
                result.push(...resultTemp);
            }
            if (result.length >= 10) {
                break;
            }
        }
        return JSON.parse(JSON.stringify(result.slice(0, 10)));
    }
}