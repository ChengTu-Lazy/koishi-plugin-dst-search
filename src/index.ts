import { Context, Schema } from 'koishi'
import { UpdateHelper } from './Helpers/UpdateHelper'
import { DatabaseHelper } from './Helpers/DatabaseHelper'
import { MessageHelper } from './Helpers/MessageHelper'
import { } from 'koishi-plugin-puppeteer'

export const name = 'dst-search'
export const using = ['database']
export const inject = 'puppeteer'

//配置构型
export interface Config {
  IsSendImage: boolean
  DefaultPlatform: any
  DefaultRgion: any
  DefaultSearchName: any
  Token: string
  NumberOfRoomsDisplayed: number
  Authority: number
  Interval: number
}

export const Config: Schema<Config> = Schema.object({
  Authority: Schema.number().default(0).description('默认指令权限等级'),
  DefaultSearchName: Schema.array(Schema.object({
    房间名: Schema.string(),
    目标群: Schema.string(),
    平台: Schema.union([
      Schema.const('Steam').description('Steam'),
      Schema.const('Rail').description('WeGame'),
      Schema.const('Switch').description('Switch'),
      Schema.const('PSN').description('PlayStation'),
      Schema.const('XBone').description('Xbox'),
    ]),
  })).default([{
    房间名: '漓江塔',
    目标群: '',
    平台: "Steam"
  }]).role('table').description('设置默认查询的房间名称(模糊匹配)、目标群组不填则为任意群组都可以查看'),
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
  ])).role('table').default(["ap-east-1", "us-east-1", 'eu-central-1', 'ap-southeast-1']).description('设置默认查询的游戏地区,中国开服一般都是ap-east-1哦,具体的可以看游戏服务器开服日志,可以多选,但是多选会拖慢查询速度哦'),

  NumberOfRoomsDisplayed: Schema.number().default(10).description('查询时展示的房间个数'),
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

class StaticValue {
  static CanRunning = true; // 标志变量，控制循环的终止条件
  static IntervalId; // 标志变量，控制循环的终止条件
}


//插件入口
export async function apply(ctx: Context, config: Config) {

  //数据库初始化
  const databaseHelper = new DatabaseHelper();
  await databaseHelper.DatabaseInitAsync(ctx, config);

  ctx.command('s-simple [name]', "查询饥荒联机服务器简略信息", { authority: config.Authority })
  .shortcut(/^查房 (.*)*$/, { args: ['$1'] })
  .shortcut(/^查房$/, { args: ['$1'] })
  .action(async (Session, name) => {
    try {
      const userId = Session.session.userId;
      const databaseHelper = new DatabaseHelper();
      const messageHelper = new MessageHelper();
      const sendJson: JSON[] = [];

      // 获取默认查询的配置
      const defaultSearchNames = config.DefaultSearchName.filter(searchName => 
        searchName.目标群 === Session.session.guildId || !searchName.目标群
      );

      const getInfo = async (roomName: string, platform?: string) => {
        return platform
          ? await databaseHelper.GetSimpleInfoByNameAndPlatformAsync(ctx, config, roomName, platform)
          : await databaseHelper.GetSimpleInfoByNameAsync(ctx, config, roomName);
      };

      if (name === undefined) {
        for (const { 房间名, 平台 } of defaultSearchNames) {
          const result = await getInfo(房间名, 平台);
          if (result) sendJson.push(...result);
        }
      } else {
        let flag = false;
        for (const { 房间名, 平台 } of defaultSearchNames) {
          if (!房间名) {
            const result = await getInfo(name, 平台);
            if (result) sendJson.push(...result);
            flag = true;
          }
        }
        if (!flag) {
          const result = await getInfo(name);
          if (result) sendJson.push(...result);
        }
      }

      // 存储用户简单查询的相关数据
      await databaseHelper.SetUserSearchInfoAsync(ctx, userId, JSON.parse(JSON.stringify(sendJson)));
      let send = await messageHelper.GetMessageAsync(sendJson);
      if (config.IsSendImage) {
        send = await messageHelper.GetImageAsync(ctx, send);
      }
      return send;
    } catch (error) {
      console.error(error);
    }
  });

  ctx.command('s-detail [number]', "查询饥荒联机单个服务器详细信息", { authority: config.Authority }).shortcut(/^\.(\d+)$/, { args: ['$1'] }).shortcut(/^\。(\d+)$/, { args: ['$1'] }).action(async (Session, numberStr) => {
    let userId = Session.session.userId
    let index = Number.parseInt(numberStr)
    try {
      let messageHelper = new MessageHelper()
      let send = await messageHelper.GetDetailInfoAsync(ctx, config, userId, index)
      if (config.IsSendImage) {
        send = await messageHelper.GetImageAsync(ctx, send)
      }
      return send
    } catch (error) {
      return "请先查询再选择！"
    }
  })

  ctx.command('s-image [flag]', "设置输出的格式是否为图片（1：true,0：false,不输取反）", { authority: config.Authority }).shortcut(/^\|\| (1|0)$/, { args: ['$1'] }).shortcut(/^\|\|$/, { args: ['$1'] }).action(async (Session, flag) => {
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


  ctx.on('ready', async () => {
    StaticValue.IntervalId = setInterval(doTaskAsync, config.Interval);
  });

  ctx.on('dispose', () => {
    clearInterval(StaticValue.IntervalId);
  });

  // 定时更新数据内容
  async function doTaskAsync() {
    if (!StaticValue.CanRunning) {
      return
    }
    StaticValue.CanRunning = false;
    const updateHelper = new UpdateHelper();
    await updateHelper.UpdateSimpleInfoAsync(ctx, config);
    StaticValue.CanRunning = true;
  }
}
