import { RegionProvider } from "./region-provider";
import { Context } from "koishi";

export class DbRegionProvider extends RegionProvider {
    async getRegionsAsync(ctx: Context): Promise<JSON> {
        try {
            const DbRegionInfo = await ctx.database.get('dstinfo', { id: 1 });
            let RegionInfo = DbRegionInfo[0].info
            return RegionInfo
        } catch (err) {
            console.error('Failed to get Regions');
        }
    }
}