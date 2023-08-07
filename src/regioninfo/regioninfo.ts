import { Context } from "koishi";
import { RegionProvider, ApiRegionProvider, DbRegionProvider } from "../modules/regioninfo-module";

export class RegionInfo {
  async getRegionsAsync(ctx: Context) {
    try {
        const DbRegionInfo = await ctx.database.get('dstinfo', { id: 1 });
        let regionsProvider: RegionProvider
        let regions : JSON
        if (DbRegionInfo.length === 0) {
          regionsProvider = new ApiRegionProvider()
          regions = await regionsProvider.getRegionsAsync(ctx);
          await regionsProvider.setRegionsAsync(ctx,regions);
          return regions;
        }
        else{
          regionsProvider = new DbRegionProvider()
          regions = await regionsProvider.getRegionsAsync(ctx);
          return regions;
        }
    } catch (err) {
        console.error('Failed to get Regions');
        console.log(err);
    }
  }

  async setRegionsAsync(ctx:Context,regions:JSON): Promise<void> {
    try {
      let regionProvider = new RegionProvider()
      await regionProvider.setRegionsAsync(ctx,regions);
    } catch (err) {
      console.error('Failed to set DbRegionInfo');
      console.log(err);
    }
  }

  async updateRegionsAsync(ctx:Context): Promise<void> {
    try {
      let regionProvider = new ApiRegionProvider()
      let regions_new = await regionProvider.getRegionsAsync(ctx);
      regionProvider.setRegionsAsync(ctx,regions_new);
    } catch (err) {
      console.error('Failed to update DbRegionInfo');
      console.log(err);
    }
  }
}