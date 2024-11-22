import { Context } from "koishi";
import { HttpHelper } from "./HttpHelper";
import { DatabaseHelper } from "./DatabaseHelper";
import { Config } from "..";
import { MessageHelper } from "./MessageHelper";

export class UpdateHelper {
  ctx: Context
  config: Config
  httpHelper: HttpHelper
  databaseHelper: DatabaseHelper
  messageHelper: MessageHelper
  constructor(ctx: Context, config: Config) {
    this.ctx = ctx;
    this.config = config;
    this.httpHelper = new HttpHelper(this.ctx, this.config);
    this.databaseHelper = new DatabaseHelper(this.ctx, this.config);
    this.messageHelper = new MessageHelper(this.ctx, this.config);
  }

  //更新简单信息
  async UpdateSimpleInfoAsync() {
    if (this.config.IsDebuging) {
      const simpleInfoArr = await this.ctx.database.get('dstinfo', { id: 2 });
      const detailInfoArrjson = await this.ctx.database.get('dstinfo', { id: 3 });
      if (simpleInfoArr[0].info && detailInfoArrjson[0].info[0] != undefined) return;
    }
    try {
      let simpleInfo: JSON = await this.httpHelper.GetSimpleInfoAsync();
      await this.databaseHelper.SetInfoByIdAsync(2, simpleInfo)
    } catch (err) {
      console.error('Failed to update SimpleInfo');
    }
  }

}
