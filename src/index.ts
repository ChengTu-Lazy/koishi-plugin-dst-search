import { Context, Schema, h } from 'koishi'
import { } from 'koishi-plugin-puppeteer'
export const name = 'dst-search'
export const using = ['database']

import { SimpleInfo } from "./modules/simpleinfo-module";
import { DetailInfo } from "./modules/detailinfo-module";
import { RegionInfo } from './regionInfo/regioninfo';

//配置构型
export interface Config {
  IsSendImage: boolean
  DefaultSearchName: string[]
  Token: string
  Interval: number
}

export const Config: Schema<Config> = Schema.object({
  IsSendImage: Schema.boolean().default(false).description('设置默认发送信息是否为图片格式，开启该功能前请检查puppeteer服务是否正确开启，图画转换功能依赖于此插件！'),
  DefaultSearchName: Schema.array(String).role('table').default(["漓江塔"]).description('设置默认查询的房间名称(模糊匹配)'),
  Token: Schema.string().default('pds-g^KU_iC59_53i^ByQO7jK+mAPCqmyfQEo5eONht2EL6pCSKjz+1kFA2fI=').description('详细查询所需要的Token'),
  Interval: Schema.number().default(30000).description('自动更新数据库中默认房间信息间隔（ms）'),
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

  ctx.command('s-image [flag]', "设置输出的格式是否为图片（1：true，0：false，不输取反）").shortcut(/^\|\| (1|0)$/, { args: ['$1'] }).shortcut(/^\|\|$/, { args: ['$1'] }).action(async (Session, flag) => {
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
    return `查房格式切换成功，当前为${config.IsSendImage ? "图片输出模式！" : "文字输出模式！"}`
  })

  ctx.command('s-simple [name]', "查询饥荒联机服务器简略信息").shortcut(/^查房 (.*)*$/, { args: ['$1'] }).shortcut(/^查房$/, { args: ['$1'] }).action(async (Session, name) => {
    let userId = Session.session.userId
    let simpleInfoJson = await simpleInfo.getSimpleInfoAsync(ctx, name, config)
    let send = await simpleInfo.getMessageAsync(ctx, name, config)

    //简单查询之后计入数据库，存储后期详细查询需要的rowid
    simpleInfo.setUserSearchInfoAsync(ctx, userId, simpleInfoJson)

    if (config.IsSendImage) {
      send = await simpleInfo.getImageAsync(ctx, send)
    }

    return send
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
      // console.log(error);
      return "请先查询再选择！"
    }
  })


  //定时更新数据内容,重新配置了默认内容之后得要重启koishi
  async function doTaskAsync() {
    await regionInfo.updateRegionsAsync(ctx)
    await simpleInfo.updateSimpleInfosAsync(ctx, config)
    await detailInfo.updateDetailInfoAsync(ctx, config.Token)
  }

  async function runAsyncTaskWithInterval(fn, interval) {
    while (true) {
      await new Promise(resolve => setTimeout(resolve, interval))
      await fn()
    }
  }

  runAsyncTaskWithInterval(doTaskAsync, config.Interval)

}