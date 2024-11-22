import { Context } from 'koishi'
import { Config } from '..';
import { ConverteHelper } from './ConverteHelper';
import { HttpHelper } from './HttpHelper';
import { DatabaseHelper } from './DatabaseHelper';

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

  ctx: Context
  config: Config
  constructor(ctx: Context, config: Config) {
    this.ctx = ctx;
    this.config = config;
  }

  async GetImageAsync(str: string) {
    try {
      let res = await this.ctx.puppeteer.render(
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

  // 获取房间简单信息
  async GetSimpleMsgAsync(jsonStr: JSON[]): Promise<string> {
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

  // 获取房间详细信息
  async GetDetailInfoAsync(userId: string, index: number) {
    try {
      let rowIdArray = (await this.ctx.database.get('dstinfo', { name: userId }))[0].info
      let length = JSON.parse(JSON.stringify(rowIdArray)).length
      let httpHelper = new HttpHelper(this.ctx, this.config)
      if (length == 0) {
        return "请先查询服务器"
      }
      if (index > length || index <= 0) {
        return `不在可选范围，当前可查${length}个服务器"`
      }
      let rowId = rowIdArray[index - 1]
      let detailInfoJson = await httpHelper.GetDetailInfoAsync(rowId)
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

  //解析玩家数据
  ParsePlayersData(luaStr: string) {
    // 去掉开头和结尾的 `return {` 和 `}`
    luaStr = luaStr.trim().replace(/^return\s*\{/, "").replace(/\}$/, "").trim();

    // 替换等号为冒号，并在属性和字符串值上加上双引号
    luaStr = luaStr.replace(/(\w+)\s*=\s*("[^"]*"|\d+)/g, '"$1": $2');

    // 处理属性值为字符串的情况，例如 `name="<size=\"71\">做菜新手嘎嘎</size>"`
    luaStr = luaStr.replace(/"([^"]*)":\s*"([^"]*)"/g, (_, key, value) => {
      const formattedValue = value.replace(/\\"/g, '"'); // 保留字符串中的双引号
      return `"${key}": "${formattedValue}"`;
    });

    // 去掉属性名中的方括号
    luaStr = luaStr.replace(/\["(\w+)"\]\=/g, '"$1"\:');

    let result = `[${luaStr}]`;
    // 转换为 JSON 对象数组
    try {
      const jsonArray = JSON.parse(result);
      return Array.isArray(jsonArray) ? jsonArray : [jsonArray];
    } catch (error) {
      console.log(result);
      console.error("Error parsing JSON:", error);
      return [];
    }
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

  async GetSendJson(name: string, session): Promise<JSON[]> {
    const sendJson: JSON[] = [];
    const databaseHelper = new DatabaseHelper(this.ctx, this.config);

    // 获取默认查询的配置
    const defaultSearchNames = this.config.DefaultSearchName.filter(searchName =>
      searchName.目标群 === session.guildId || !searchName.目标群
    );
    const getInfo = async (roomName: string, platform?: string) => {
      return platform
        ? await databaseHelper.GetSimpleInfoByNameAndPlatformAsync(roomName, platform)
        : await databaseHelper.GetSimpleInfoByNameAsync(roomName);
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
    return sendJson;
  }

}
