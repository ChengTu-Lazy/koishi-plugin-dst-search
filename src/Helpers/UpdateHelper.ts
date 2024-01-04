import { Context } from "koishi";
import { HttpHelper } from "./HttpHelper";
import { DatabaseHelper } from "./DatabaseHelper";
import { Config } from "..";
import { log } from "util";

export class UpdateHelper {

  async UpdateRegionAsync(ctx: Context) {
    try {
      let httpHelper = new HttpHelper();
      let databaseHelper = new DatabaseHelper();
      let regions_new = await httpHelper.GetRegionAsync(ctx);
      await databaseHelper.SetInfoByIdAsync(ctx, 1, regions_new)
    } catch (err) {
      console.error('Failed to update RegionInfo');
    }
  }

  async UpdateSimpleInfoAsync(ctx: Context, config: Config) {
    try {
      let httpHelper = new HttpHelper();
      let databaseHelper = new DatabaseHelper();
      let simpleInfo: JSON = await httpHelper.GetSimpleInfoAsync(ctx, config);
      await databaseHelper.SetInfoByIdAsync(ctx, 2, simpleInfo)
    } catch (err) {
      console.error('Failed to update SimpleInfo');
    }
  }

  async UpdateDetailInfoAsync(ctx: Context) {

  }

}
