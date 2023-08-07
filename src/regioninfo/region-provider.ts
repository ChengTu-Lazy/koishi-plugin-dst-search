import { Context } from "koishi";

export class RegionProvider {
  async getRegionsAsync(ctx: Context):Promise<JSON> {
    return
  }

  async setRegionsAsync(ctx: Context, regions: JSON): Promise<void> {
    try {
      const x = await ctx.database.get('dstinfo', { id: 1 });
      let regionsJson = JSON.parse(JSON.stringify(regions));
      if (x.length === 0) {
        await ctx.database.create('dstinfo', {
          id: 1,
          name: 'RegionInfo',
          info: regionsJson,
        });
      } else {
        await ctx.database.set('dstinfo', { id: 1 }, {
          name: 'RegionInfo',
          info: regionsJson,
        });
      }
    } catch (err) {
      console.error('Failed to update DbRegionInfo');
      console.log(err);
    }
  }
}