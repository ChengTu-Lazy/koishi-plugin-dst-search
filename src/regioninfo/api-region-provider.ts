import { RegionProvider } from "./region-provider";
import { Context } from "koishi";

export class ApiRegionProvider extends RegionProvider {
    async getRegionsAsync(ctx: Context): Promise<JSON> {
        try {
            const result = await ctx.http.get('https://lobby-v2-cdn.klei.com/regioncapabilities-v2.json');
            const regions = result.LobbyRegions.map((x: { Region: string }) => x.Region);
            regions.sort((a: string, b: string) => {
                if (a === 'ap-east-1') {
                    return -1;  // 如果 a 是 ap-east-1，排在前面
                } else if (b === 'ap-east-1') {
                    return 1;   // 如果 b 是 ap-east-1，排在前面
                } else {
                    return 0;   // 其他情况不需要改变元素顺序
                }
            });
            return regions;
        } catch (err) {
            console.error('Failed to get Regions');
            console.log(err);
        }
    }
}