import { DetailInfoProvider } from "./detailinfo-provider";
import { SimpleInfo } from "../simpleInfo/simpleinfo";
import { Context } from "koishi";
import { RegionInfo } from "../modules/regioninfo-module";

export class ApiDetailInfoProvider extends DetailInfoProvider {
  async getDetailInfosAsync(ctx: Context, rowId: string, token: string): Promise<JSON> {
    let regionInfo = new RegionInfo();
    const regions = await regionInfo.getRegionsAsync(ctx);
    for (const region of JSON.parse(JSON.stringify(regions))) {
      const url = `https://lobby-v2-${region}.klei.com/lobby/read`;
      try {
        const response = await ctx.http.post(url, {
          "__token": `${token}`,
          "__gameId": "DST",
          "Query": {
            "__rowId": `${rowId}`
          }
        });

        return response.GET
      } catch (error) {
        //查不到的时候的报错，直接忽略
      }
    }
  }
}