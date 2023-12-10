import { Context, Schema, h } from 'koishi'
import { } from 'koishi-plugin-puppeteer'
export const name = 'dst-search'
export const using = ['database']

import { SimpleInfo } from "./modules/simpleinfo-module";
import { DetailInfo } from "./modules/detailinfo-module";
import { RegionInfo } from './regioninfo/regioninfo';

//配置构型
export interface Config {
  IsSendImage: boolean
  DefaultPlatform: any
  DefaultRgion: any
  DefaultSearchName: string[]
  Token: string
  Interval: number
}

export const Config: Schema<Config> = Schema.object({
  DefaultSearchName: Schema.array(String).role('table').default(["漓江塔"]).description('设置默认查询的房间名称(模糊匹配)'),

  DefaultPlatform: Schema.array(Schema.union([
    Schema.const('Steam').description('Steam'),
    Schema.const('Rail').description('WeGame'),
    Schema.const('Switch').description('Switch'),
    Schema.const('PSN').description('PlayStation'),
    Schema.const('XBone').description('Xbox'),
  ])).role('table').default(["Steam"]).description('设置默认查询的游戏平台,可以多选,但是多选会拖慢查询速度哦'),

  DefaultRgion: Schema.array(Schema.union([
    Schema.const('ap-east-1').description('ap-east-1'),
    Schema.const('us-east-1').description('us-east-1'),
    Schema.const('eu-central-1').description('eu-central-1'),
    Schema.const('ap-southeast-1').description('ap-southeast-1'),
  ])).role('table').default(["ap-east-1","us-east-1",'eu-central-1','ap-southeast-1']).description('设置默认查询的游戏地区,中国开服一般都是ap-east-1哦,具体的可以看游戏服务器开服日志,可以多选,但是多选会拖慢查询速度哦'),

  Token: Schema.string().default('pds-g^KU_iC59_53i^ByQO7jK+mAPCqmyfQEo5eONht2EL6pCSKjz+1kFA2fI=').description('详细查询所需要的Token'),
  IsSendImage: Schema.boolean().default(false).description('设置默认发送信息是否为图片格式,开启该功能前请检查puppeteer服务是否正确开启,图画转换功能依赖于此插件！'),
  Interval: Schema.number().default(30000).description('自动更新数据库中默认房间信息间隔(ms),重新配置了默认内容之后得要重启koishi!'),
})

//数据表的定义
declare module 'koishi' {
  interface Tables {
    dstinfo: DSTInfo
  }
}

export interface DSTInfo {
  id: number
  name: string
  info: JSON
}


//插件入口
export async function apply(ctx: Context, config: Config) {


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

  let regionInfo = new RegionInfo()
  let simpleInfo = new SimpleInfo()
  let detailInfo = new DetailInfo()
  await regionInfo.updateRegionsAsync(ctx);
  await simpleInfo.updateSimpleInfosAsync(ctx, config);
  await detailInfo.updateDetailInfoAsync(ctx, config.Token);

  ctx.command('s-image [flag]', "设置输出的格式是否为图片（1：true,0：false,不输取反）").shortcut(/^\|\| (1|0)$/, { args: ['$1'] }).shortcut(/^\|\|$/, { args: ['$1'] }).action(async (Session, flag) => {
    if (flag == null) {
      config.IsSendImage = !config.IsSendImage
    } else {
      switch (flag.toString()) {
        case "0":
          config.IsSendImage = false
          break;
        case "1":
          config.IsSendImage = true
          break;
        default:
          config.IsSendImage = !config.IsSendImage
          break;
      }
    }
    return `查房格式切换成功,当前为${config.IsSendImage ? "图片输出模式！" : "文字输出模式！"}`
  })

  ctx.command('s-simple [name]', "查询饥荒联机服务器简略信息").shortcut(/^查房 (.*)*$/, { args: ['$1'] }).shortcut(/^查房$/, { args: ['$1'] }).action(async (Session, name) => {
    try {
      let userId = Session.session.userId
      let simpleInfoJson = await simpleInfo.getSimpleInfoAsync(ctx, name, config)
      let send = await simpleInfo.getMessageAsync(ctx, name, config)

      //简单查询之后计入数据库,存储后期详细查询需要的rowid
      simpleInfo.setUserSearchInfoAsync(ctx, userId, simpleInfoJson)

      if (config.IsSendImage) {
        send = await simpleInfo.getImageAsync(ctx, send)
      }
      detailInfo.updateDetailInfoAsync(ctx, config.Token)
      return send
    } catch (error) {
      await regionInfo.updateRegionsAsync(ctx)
      await simpleInfo.updateSimpleInfosAsync(ctx, config)
      await detailInfo.updateDetailInfoAsync(ctx, config.Token)
      return "数据库已刷新,请重试！"
    }
  })

  ctx.command('s-detail [number]', "查询饥荒联机单个服务器详细信息").shortcut(/^\.(\d+)$/, { args: ['$1'] }).shortcut(/^\。(\d+)$/, { args: ['$1'] }).action(async (Session, numberStr) => {
    let userId = Session.session.userId
    let index = Number.parseInt(numberStr)
    let send: any
    try {
      let detailInfoJson = await detailInfo.getDetailInfoAsync(ctx, config.Token, userId, index)
      send = await detailInfo.getMessageAsync(detailInfoJson)
      if (config.IsSendImage) {
        send = await detailInfo.getImageAsync(ctx, send)
      }
      return send
    } catch (error) {
      console.log(error);
      return "请先查询再选择！"
    }
  })

  let isRunning = true; // 标志变量，控制循环的终止条件

  async function runAsyncTaskWithInterval(fn, interval) {
    while (isRunning) {
      await fn();
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  ctx.on('ready', () => {
    runAsyncTaskWithInterval(doTaskAsync, config.Interval);
  });

  ctx.on('dispose', () => {
    isRunning = false; // 设置标志变量为 false，停止循环任务
  });

  // 定时更新数据内容，在重新配置默认内容后需要重启 koishi
  async function doTaskAsync() {
    await regionInfo.updateRegionsAsync(ctx);
    await simpleInfo.updateSimpleInfosAsync(ctx, config);
    await detailInfo.updateDetailInfoAsync(ctx, config.Token);
  }
}