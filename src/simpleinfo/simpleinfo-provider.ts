import { Context } from "koishi";

export class SimpleInfoProvider {
  async getSimpleInfosAsync(ctx: Context,searchName?:string) :Promise<JSON>{
    return 
  }

  async setSimpleInfosAsync(ctx: Context, SimpleInfosJson: JSON): Promise<void> {
    try {
      const SimpleInfo = await ctx.database.get('dstinfo', { id: 2 });
      if (SimpleInfo.length === 0) {
        await ctx.database.create('dstinfo', {
          id: 2,
          name: 'SimpleInfo',
          info: SimpleInfosJson,
        });
      } else {
        await ctx.database.set('dstinfo', { id: 2 }, {
          name: 'SimpleInfo',
          info: SimpleInfosJson,
        });
      }
    } catch (err) {
      console.error('Failed to update DbRegionInfo');
      console.log(err);
    }
  }
}