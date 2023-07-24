import { Context, Schema } from 'koishi'
import * as dbAPI from './utls/db'
import * as dataAPI from './utls/data'
import * as searchUtl from './utls/search'
import { Session } from 'inspector'
import { log } from 'console'

export const name = 'dst-search'

//配置构型
export interface Config {
  DefaultSearchName : string[]
  Token : string
  Interval:number
}

export const Config: Schema<Config> = Schema.object({
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
  name:string
  info: JSON
}


//插件入口
export  async function apply(ctx: Context, config: Config) {

  ctx.command('s-simple [name]',"查询饥荒联机服务器简略信息").shortcut(/^查房 (.*)*$/, { args: ['$1'] }).shortcut(/^查房$/, { args: ['$1'] }).action(async (Session,name)=>{
    let userId = Session.session.userId
    let names = []
    let send = ""
    if (name == null || config.DefaultSearchName.includes(name)) {
      names = config.DefaultSearchName
      send = await searchUtl.getSimpleSendInfoByArrayAsync(ctx,config,userId,names)
    }else{
      send = await searchUtl.getSimpleSendInfoAsync(ctx,config,userId,name)
    }
    return send
  })

  ctx.command('s-detail [number]',"查询饥荒联机单个服务器详细信息").shortcut(/^\.(\d+)$/, { args: ['$1'] }).shortcut(/^\。(\d+)$/, { args: ['$1'] }).action(async (Session,numberStr)=>{
    let userId = Session.session.userId
    const data = await ctx.database.get('dstinfo',{name : userId})
    try {
      const rowIds:string[] = JSON.parse(JSON.stringify(data[0].info))
      const num = parseInt(numberStr, 10);
  
      if (rowIds.length >= num && num > 0) {
        const rowId = await dataAPI.getRowIdByArrayAsync(ctx,rowIds,num)
        const detailInfo  = (await dataAPI.getRoomDetailInfoAsync(ctx,config.Token,rowId))[0]
        const send  = await searchUtl.getDetailSendInfoAsync(ctx,config,userId,detailInfo)

        // //数据进行处理之后输出
        return send
      }else if (rowIds.length < num) {
        return `超出选择范围，当前有${rowIds.length}个可选项`
      }else{
        return "输入不规范，请重新输入"
      }
    } catch (error) {
      // console.log(error);
      return "请先查询再选择！"
    }
  })



  //数据表的创建
  ctx.model.extend('dstinfo', {
    // 各字段类型
    id: 'unsigned',
    name:'string',
    info: 'json',
  }, {
    // 使用自增的主键值
    autoInc: true,
  })

  //定时更新数据内容,重新配置了默认内容之后得要重启koishi
  async function doTaskAsync() {
    await dbAPI.updateDbRegionInfoAsync(ctx)
    await dbAPI.updateDbRoomSimpleInfoAsync(ctx, config)
    await dbAPI.updateDbRoomDetailInfoAsync(ctx, config)
  }
  
  async function runAsyncTaskWithInterval(fn, interval) {
    while (true) {
      await new Promise(resolve => setTimeout(resolve, interval))
      await fn()
    }
  }
  
  runAsyncTaskWithInterval(doTaskAsync, config.Interval)

}