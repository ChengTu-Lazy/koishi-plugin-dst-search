import { Context } from 'koishi'
import { Config } from '..';
import { ConverteHelper } from './ConverteHelper';
import { HttpHelper } from './HttpHelper';

export interface SimpleInfoType {
  name: string;
  mode: string;
  rowId: string;
  season: string;
  maxconnections: number;
  connected: number;
  version: number;
}

export class MessageHelper {

  async GetImageAsync(ctx: Context, str: string) {
    try {
      let res = await ctx.puppeteer.render(
        `
            <!DOCTYPE html>
            <html lang="en">

            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <script src="https://cdn.tailwindcss.com"></script>
            </head>

            <body class="bg-gray-100 text-black" style="width: 450px">
                <div class="mx-auto px-4 max-w-400 w-auto bg-white p-4">
                    <div>
                        <div class="font-bold">${str.replace(/\n/g, '<br>')}</div>
                    </div>
                </div>
            </body>

            </html>
        `
      )
      return res
    } catch (error) {
      return "请检查puppeteer服务是否正确开启，图画转换功能依赖于此插件！"
    }
  }

  async GetMessageAsync(jsonStr: JSON[]): Promise<string> {
    if (JSON.stringify(jsonStr) !== "[]") {
      const simpleinfo: SimpleInfoType[] = JSON.parse(JSON.stringify(jsonStr));
      const output = simpleinfo.map((item, index) => {
        let { name, connected, maxconnections, season, mode } = item;
        let converter = new ConverteHelper()
        season = converter.SeasonToZh(season)
        mode = converter.ModeToZh(mode)
        return `${index + 1}.${name}(${connected}/${maxconnections})${season}(${mode})`;
      }).join('\n');
      return `${output}\n发送“.服务器序号”查询服务器详细信息，如:“.1”`;
    }
    else {
      return "未找到该服务器！"
    }
  }

  async GetDetailInfoAsync(ctx: Context, config: Config, userId: string, index: number) {
    try {
      let rowIdArray = (await ctx.database.get('dstinfo', { name: userId }))[0].info
      let length = JSON.parse(JSON.stringify(rowIdArray)).length
      let httpHelper = new HttpHelper()
      if (length == 0) {
        return "请先查询服务器"
      }
      if (index > length || index <= 0) {
        return `不在可选范围，当前可查${length}个服务器"`
      }
      let rowId = rowIdArray[index - 1]
      let detailInfoJson = await httpHelper.GetDetailInfoAsync(ctx, config, rowId)
      let send = await this.ProcessDetailInfoAsync(detailInfoJson)
      return send
    } catch (error) {
    }
  }

  async ProcessDetailInfoAsync(jsonStr) {

    const convertHelper = new ConverteHelper()

    const name = jsonStr.name;
    const addr = jsonStr.__addr;
    const port = jsonStr.port;
    const connectCode = this.GetConnectCode(addr, port);

    const maxConnections = jsonStr.maxconnections;
    const connected = jsonStr.connected;
    const platform = convertHelper.PlatformToZh(jsonStr.platform);
    const season = convertHelper.SeasonToZh(jsonStr.season);
    let intent = jsonStr.intent;
    intent = convertHelper.ModeToZh(intent)

    const players = jsonStr.players;

    const playerList = await this.GetPlayerListAsync(players);

    const modsInfo = jsonStr.mods_info;
    const modList = this.GetModList(modsInfo);

    const data = jsonStr.data;
    const dayInfo = this.GetDayInfo(data);
    const currentDay = dayInfo[1];
    const daysElapsedInSeason = dayInfo[2];
    const daysLeftInSeason = dayInfo[3];
    const totalSeasonDays = parseInt(daysElapsedInSeason, 10) + parseInt(daysLeftInSeason, 10);

    // 格式化输出字符串
    const output = `[${name}](${platform})(${connected}/${maxConnections})\n` +
      `[天数]${currentDay}${season}(${daysElapsedInSeason}/${totalSeasonDays})(${intent})\n` +
      `🏆玩家列表🏆\n${playerList}\n📃模组列表📃\n${modList}\n` +
      `直连代码：${connectCode}`;

    return output;
  }

  GetConnectCode(addr: string, port: string): string {
    if (addr == "127.0.0.1") {
      return "本地服务器,无公网IP,无法直连"
    }
    return `c_connect("${addr}", ${port})`;
  }

  async GetPlayerListAsync(data: string) {
    const parsedData = this.ParsePlayersData(data);
    if (parsedData.length === 0) {
      return "无";
    }
    const mergedData = await Promise.all(parsedData.map(async (item, index) => {
      const { name, prefab } = item;
      const convertHelper = new ConverteHelper()
      const translatedPrefab = convertHelper.CharacterToZh(prefab);
      const displayString = `${index + 1}. ${name}${translatedPrefab ? ` (${translatedPrefab})` : ''}`;
      return displayString;
    }));
    let result = "";
    if (mergedData.length === 1) {
      result = mergedData[0];
    } else {
      const lastItem = mergedData.pop();
      result = mergedData.join('\n') + '\n' + lastItem;
    }
    return result;
  }

  ParsePlayersData(dataStr: string) {
    // 去掉字符串中的 return 关键字
    dataStr = dataStr.replace(/return\s+/, '');
    // 匹配第一个左大括号和最后一个右大括号之间的内容，并将其替换为方括号
    const jsonStr = dataStr.replace(/^[^{]*{([\s\S]*)}[^}]*$/, '[$1]');
    // 将属性名替换成双引号包裹的字符串
    const jsonStrWithQuotes = jsonStr.replace(/(\w+)\s*=/g, '"$1":');
    // 将单引号替换成双引号
    const jsonString = jsonStrWithQuotes.replace(/'/g, '"');
    // 返回解析后的 JSON 数组
    return JSON.parse(jsonString);
  }

  GetModList(data: string[]): string {
    const result = (data || []).reduce((acc: string[], curr: string, index: number) => {
      // 每 5 个元素为一个完整的数据项
      if (index % 5 === 1) {
        const addonName = curr;
        const displayString = `${acc.length + 1}. ${addonName}`;
        acc.push(displayString);
      }
      return acc;
    }, []);
    if (result.length === 0) {
      return "无";
    } else {
      return result.join('\n');
    }
  }

  GetDayInfo(dataStr: string) {
    const regex = /day=(\d+),\s*dayselapsedinseason=(\d+),\s*daysleftinseason=(\d+)/;
    const match = dataStr.match(regex);
    return match
  }

}
