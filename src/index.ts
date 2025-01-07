import { Context, Logger, Schema } from 'koishi'
import { UpdateHelper } from './Helpers/UpdateHelper'
import { DatabaseHelper } from './Helpers/DatabaseHelper'
import { MessageHelper } from './Helpers/MessageHelper'
import { Timer } from './Helpers/Timer'
import { } from 'koishi-plugin-puppeteer'
import { WebsocketServer } from './Helpers/WebSocketHelper'


//#region 参数设置
export const name = 'dst-search'
export const inject = {
  required: ['database'],
  optional: ['puppeteer']
}
export interface Config {
  IsSendImage: boolean
  IsDebuging: boolean
  DefaultPlatform: any
  DefaultRgion: any
  DefaultSearchName: any
  Token: string
  NumberOfRoomsDisplayed: number
  Interval: number
  WSSPort: number
  WSSUserList: any
  CommandAlias: any
}

export const Config: Schema<Config> = Schema.object({
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
    目标群: '456906519',
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
  Interval: Schema.number().default(30000).description('自动更新数据库中默认房间信息间隔(ms)'),
  WSSPort: Schema.number().default(12000).description('默认websocketServer端口'),
  WSSUserList: Schema.array(Schema.object({
    允许操作的用户: Schema.string(),
    Token: Schema.string(),
    连接状态: Schema.boolean().default(false).hidden(),
  })).default([]).role('table').description('设置ws链接token和可以使用websocket的用户'),
  CommandAlias: Schema.array(Schema.object({
    代称: Schema.string(),
    指令: Schema.string(),
  })).default([{
    代称: "1",
    指令: "开服",
  },
  {
    代称: "2",
    指令: "关服",
  }]).role('table').description('使用指令别名来执行指令(这里的指令是直接发送给服务器的内容)'),
  IsDebuging: Schema.boolean().default(false).description('设置默认是为调试模式'),
})

//#endregion

//插件入口
export async function apply(ctx: Context, config: Config) {
  const messageHelper = new MessageHelper(ctx, config)
  const databaseHelper = new DatabaseHelper(ctx, config);
  const timer = new Timer(ctx, config);
  const logger =  new Logger(name)
  //#region 初始化

  databaseHelper.DatabaseInitAsync().then(() => {
    logger.info('数据库初始化成功');
  }).catch((error) => {
    logger.error('数据库初始化错误');
  });

  //#endregion

  const WSS = new WebsocketServer(ctx, config,logger);
  //#region 事件

  ctx.on('ready', async () => {
    WSS.CreatServer(config);
    timer.Task1 = setInterval(() => timer.doTaskAsync(UpdateHelper.prototype.UpdateSimpleInfoAsync), config.Interval);
  });

  ctx.on('dispose', () => {
    WSS.CloseServer()
    clearInterval(timer.Task1);
  });

  //#endregion

  //#region 指令

  ctx.command('s-simple [name]', "查询饥荒联机服务器简略信息")
    .alias("查房")
    .action(async (Session, name) => {
      try {
        const userId = Session.session.userId;
        const sendJson = await messageHelper.GetSendJson(name, Session.session);
        // 存储用户简单查询的相关数据
        await databaseHelper.SetUserSearchInfoAsync(userId, JSON.parse(JSON.stringify(sendJson)));
        let send = await messageHelper.GetSimpleMsgAsync(sendJson);
        if (config.IsSendImage) {
          send = await messageHelper.GetImageAsync(send);
        }
        send =  send.replace("<"," &lt;").replace(">","&gt;")
        return send;
      } catch (error) {
        console.error(error);
        return "请等待插件加载"
      }
    });

  ctx.command('s-detail [number]', "查询饥荒联机单个服务器详细信息")
    .shortcut(/^\.(\d+)$/, { args: ['$1'] })
    .shortcut(/^\。(\d+)$/, { args: ['$1'] })
    .action(async (Session, numberStr) => {
      let userId = Session.session.userId
      let index = Number.parseInt(numberStr)
      try {
        let send = await messageHelper.GetDetailInfoAsync(userId, index)
        if (config.IsSendImage) {
          send = await messageHelper.GetImageAsync(send)
        }
        send =  send.replace("<","&lt;").replace(">","&gt;")
        return send
      } catch (error) {
        return "请先查询再选择！"
      }
    })

  ctx.command('s-image [flag]', "设置输出的格式是否为图片（1：true,0：false,不输取反）")
    .alias("||")
    .action(flag => {
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

    ctx.command('s-control [roomNum] [command]', "控制房间，指令自定义")
    .alias("控房")
    .action((Session, roomNum, command) => {
      const session = Session.session;
      const userId = session.userId;
      const user = config.WSSUserList[Number(roomNum)-1];

      if (!user) {
        return ` 要控制的 ${roomNum}号房间不存在`;
      }
      if (userId !== user.允许操作的用户) {
        return `你没有权限控制 ${roomNum}号房间`;
      }
      
      if (user.连接状态 === false) {
        return `${roomNum}号房间未连接`;
      }
      let commandInconfig = config.CommandAlias.find((item:any)=>item.代称 === command);  
      
      if(commandInconfig){
        command = commandInconfig.指令;
      }
      WSS.SendToClient(session, command);
    })

  //#endregion

}
