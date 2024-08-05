import { Context } from 'koishi'
import { Config } from '..';
import { UpdateHelper } from './UpdateHelper';
import { SimpleInfoType } from './MessageHelper';
import { ConverteHelper } from './ConverteHelper';
export class DatabaseHelper {

  async SetUserSearchInfoAsync(ctx: Context, userId: string, json: JSON) {
    const simpleinfo: SimpleInfoType[] = JSON.parse(JSON.stringify(json));
    const rowIds: string[] = simpleinfo.map(item => item.rowId);
    const existingInfo = await ctx.database.get('dstinfo', { name: userId });
    if (existingInfo.length === 0) {
      ctx.database.create('dstinfo', {
        name: userId,
        info: JSON.parse(JSON.stringify(rowIds)),
      });
    } else {
      ctx.database.set('dstinfo', { name: userId }, {
        name: userId,
        info: JSON.parse(JSON.stringify(rowIds)),
      });
    }
  }

  async GetSimpleInfoByNameAsync(ctx: Context, config: Config, name: string) {
    const infoArr = await ctx.database.get('dstinfo', { id: 2 });
    const infojsonArr = JSON.parse(JSON.stringify(infoArr[0].info))
    let res = infojsonArr.filter((json) => json.name.includes(name)).slice(0, config.NumberOfRoomsDisplayed);
    return res
  }

  async GetSimpleInfoByNameAndPlatformAsync(ctx: Context, config: Config, name: string, platform: string = 'Steam') {
    // 从数据库中获取信息
    const infoArr = await ctx.database.get('dstinfo', { id: 2 });
    // 将获取的信息转换为JSON数组
    const infojsonArr = JSON.parse(JSON.stringify(infoArr[0].info));
    const convertHelper = new ConverteHelper()
    platform = convertHelper.PlatformToNum(platform)
    // 根据name和platform进行筛选，并限制结果数量
    let res = infojsonArr.filter((json) => {
      return json.name.includes(name) && json.platform.toString() === platform;
    }).slice(0, config.NumberOfRoomsDisplayed);
    // 返回筛选结果
    return res;
  }


  async SetInfoByIdAsync(ctx: Context, id: number, value: JSON, name?: string) {
    const info = await ctx.database.get('dstinfo', { id: id });
    if (info.length === 0) {
      await ctx.database.create('dstinfo', {
        id: id,
        name: name,
        info: value,
      });
    } else {
      await ctx.database.set('dstinfo', { id: id }, {
        name: name,
        info: value,
      });
    }
  }

  async DatabaseInitAsync(ctx: Context, config: Config) {
    await this.InitTable(ctx);
    //设置初始默认数据行
    let DefualtJson = JSON.parse(JSON.stringify({}));
    try {
      this.SetInfoByIdAsync(ctx, 1, DefualtJson, "RegionInfo")
    } catch (error) {
      ctx.database.drop('dstinfo')
      await this.InitTable(ctx);
      this.SetInfoByIdAsync(ctx, 1, DefualtJson, "RegionInfo")
    }
    this.SetInfoByIdAsync(ctx, 2, DefualtJson, "SimpleInfo")
    this.SetInfoByIdAsync(ctx, 3, DefualtJson, "DetailInfo")

    const updateHelper = new UpdateHelper();
    await updateHelper.UpdateSimpleInfoAsync(ctx, config);
  }

  async InitTable(ctx: Context) {
    //数据表的创建
    ctx.model.extend('dstinfo', {
      // 各字段类型
      id: 'unsigned',
      name: 'string',
      info: 'json',
    }, {
      // 使用自增的主键值
      autoInc: true,
    })
  }
}

