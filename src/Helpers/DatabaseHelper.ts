import { Context } from 'koishi'
import { Config } from '..';
import { UpdateHelper } from './UpdateHelper';
import { SimpleInfoType } from './MessageHelper';
import { ConverteHelper } from './ConverteHelper';

export class DSTInfo {
  id: number
  name: string
  info: JSON
}

//数据表的定义
declare module 'koishi' {
  interface Tables {
    dstinfo: DSTInfo
  }
}

export class DatabaseHelper {
  ctx: Context
  config: Config
  constructor(ctx: Context, config: Config) {
    this.ctx = ctx;
    this.config = config;
  }

  async InitTable() {
    //数据表的创建
    this.ctx.model.extend('dstinfo', {
      id: 'unsigned',
      name: 'string',
      info: 'json',
    }, { autoInc: true })
  }

  // 保存玩家查询简单信息的数据
  async SetUserSearchInfoAsync(userId: string, json: JSON) {
    const simpleinfo: SimpleInfoType[] = JSON.parse(JSON.stringify(json));
    const rowIds: string[] = simpleinfo.map(item => item.rowId);
    const existingInfo = await this.ctx.database.get('dstinfo', { name: userId });
    if (existingInfo.length === 0) {
      this.ctx.database.create('dstinfo', {
        name: userId,
        info: JSON.parse(JSON.stringify(rowIds)),
      });
    } else {
      this.ctx.database.set('dstinfo', { name: userId }, {
        name: userId,
        info: JSON.parse(JSON.stringify(rowIds)),
      });
    }
  }

  async GetSimpleInfoByNameAsync(name: string) {
    const infoArr = await this.ctx.database.get('dstinfo', { id: 2 });
    const infojsonArr = JSON.parse(JSON.stringify(infoArr[0].info))
    let res = infojsonArr.filter((json) => json.name.includes(name)).slice(0, this.config.NumberOfRoomsDisplayed);
    return res
  }

  async GetSimpleInfoByNameAndPlatformAsync(name: string, platform: string = 'Steam') {
    // 从数据库中获取信息
    const infoArr = await this.ctx.database.get('dstinfo', { id: 2 });
    // 将获取的信息转换为JSON数组
    const infojsonArr = JSON.parse(JSON.stringify(infoArr[0].info));
    const convertHelper = new ConverteHelper()
    platform = convertHelper.PlatformToNum(platform)
    // 根据name和platform进行筛选，并限制结果数量
    let res = infojsonArr.filter((json) => {
      return json.name.includes(name) && json.platform.toString() === platform;
    }).slice(0, this.config.NumberOfRoomsDisplayed);
    // 返回筛选结果
    return res;
  }

  async SetInfoByIdAsync(id: number, value: JSON, name?: string) {
    const info = await this.ctx.database.get('dstinfo', { id: id });
    if (info.length === 0) {
      await this.ctx.database.create('dstinfo', {
        id: id,
        name: name,
        info: value,
      });
    } else {
      await this.ctx.database.set('dstinfo', { id: id }, {
        name: name,
        info: value,
      });
    }
  }

  async GetDetailInfoAsync(rowId: string) {
    const detailInfoArrjson = await this.ctx.database.get('dstinfo', { id: 3 });
    if (detailInfoArrjson[0].info[0] != undefined) {
      for (const detailInfo of detailInfoArrjson[0].info as unknown as any[]) {
        if (detailInfo.__rowId === rowId) {
          return detailInfo;
        }
        if (detailInfo.rowId === rowId) {
          return undefined;
        }
      }
    }
  }

  async DatabaseInitAsync() {
    await this.InitTable();
    //设置初始默认数据行
    let DefualtJson = JSON.parse(JSON.stringify({}));
    try {
      this.SetInfoByIdAsync(1, DefualtJson, "RegionInfo")
    } catch (error) {
      this.ctx.database.drop('dstinfo')
      await this.InitTable();
      this.SetInfoByIdAsync(1, DefualtJson, "RegionInfo")
    }
    const existingInfo2 = await this.ctx.database.get('dstinfo', { id: 2 });
    if (existingInfo2.length === 0) {
      this.SetInfoByIdAsync(2, DefualtJson, "SimpleInfo");
    }

    const existingInfo3 = await this.ctx.database.get('dstinfo', { id: 3 });
    if (existingInfo3.length === 0) {
      this.SetInfoByIdAsync(3, DefualtJson, "DetailInfo");
    }

    const updateHelper = new UpdateHelper(this.ctx, this.config);
    await updateHelper.UpdateSimpleInfoAsync();
  }

}

