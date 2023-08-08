import { SimpleInfoProvider } from "./simpleinfo-provider";
import { Context } from "koishi";
import { Config } from "..";

export class ApiSimpleInfoProvider extends SimpleInfoProvider {
    async getSimpleInfosAsync(ctx: Context,config:Config, searchName: string): Promise<JSON> {
        let result: any[] = []
        for (const region of config.DefaultRgion) {
            for(const platform of config.DefaultPlatform){
                const resultTemp = await this.getInfoAsync(ctx,searchName,region,platform)
                if (resultTemp.length !== 0) {
                    result.push(...resultTemp);
                }
                if (result.length >= 10) {
                    break;
                }
            }
        }
        return JSON.parse(JSON.stringify(result.slice(0, 10)));
    }

    async getInfoAsync(ctx: Context, searchName: string, region: string, platform: string) {
        try {
            const url = `https://lobby-v2-cdn.klei.com/${region}-${platform}.json.gz`;
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
                return resultTemp
            }
            else{
                return []
            }
        } catch (error) {
            return []
        }
    }
}