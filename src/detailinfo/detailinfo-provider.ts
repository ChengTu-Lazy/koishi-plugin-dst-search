import { Context } from "koishi";

export class DetailInfoProvider {
  async getDetailInfosAsync(ctx: Context,rowId:string, token?: string) :Promise<JSON>{
    return 
  }

  async setDetailInfosAsync(ctx: Context, DetailInfosJson: JSON): Promise<void> {
    try {
      const DetailInfo = await ctx.database.get('dstinfo', { id: 3 });
      if (DetailInfo.length === 0) {
        await ctx.database.create('dstinfo', {
          id: 3,
          name: 'DetailInfo',
          info: DetailInfosJson,
        });
      } else {
        await ctx.database.set('dstinfo', { id: 3 }, {
          name: 'DetailInfo',
          info: DetailInfosJson,
        });
      }
    } catch (err) {
      console.error('Failed to update DbRegionInfo');
      console.log(err);
    }
  }
}