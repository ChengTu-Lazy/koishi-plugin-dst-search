import { Context } from "koishi";
import { Config, name } from "../index";
import * as dataUtl from './data'
import * as converter from './translators'
import * as dbUtl from './db'

//通过名称数组来查服务器，适用于默认查房
export async function getSimpleSendInfoByArrayAsync(ctx: Context, config: Config,userId:string,names :string[]) {
  let res= [];
  for(const name of names){
    //默认加载了的房间，从数据库查
    if (config.DefaultSearchName.includes(name)) {
      res.push(...(await dbUtl.getDbRoomSimpleInfoAsync(ctx)))
      res = res.flat()
    }
    else{
      for (const searchName of config.DefaultSearchName) {
        const simpleInfos : any= await dataUtl.getRoomSimpleInfoAsync(ctx, searchName);
        res.push(...simpleInfos);
      }
      res = res.flat()
    }
  }

  const uniqueRes = Array.from(new Set(res.map(info => info.rowId))).map(rowId => {
    return res.find(info => info.rowId === rowId);
  });
  let SimpleSendInfo = await processSimpleInfoAsync(ctx,userId,uniqueRes)
  SimpleSendInfo = SimpleSendInfo +"发送“.服务器序号”查询服务器详细信息，如:“.1”"
  return SimpleSendInfo;
}

//通过名称来查服务器，适用于直接查房
export async function getSimpleSendInfoAsync(ctx: Context, config: Config,userId:string,name :string) {

  const simpleInfos : any= await dataUtl.getRoomSimpleInfoAsync(ctx, name);

  const uniqueRes = Array.from(new Set(simpleInfos.map(info => info.rowId))).map(rowId => {
    return simpleInfos.find(info => info.rowId === rowId);
  });
  let SimpleSendInfo = await processSimpleInfoAsync(ctx,userId,uniqueRes)
  SimpleSendInfo = SimpleSendInfo +"发送“.服务器序号”查询服务器详细信息，如:“.1”"
  return SimpleSendInfo;
}


export async function getDetailSendInfoAsync(detailInfo :JSON) {

  let DetailSendInfo = await processDetailInfoAsync(detailInfo)
  
  return DetailSendInfo;
}

async function processDetailInfoAsync(jsonStr: any): Promise<string> {

  const name = jsonStr.name;

  const addr = jsonStr.__addr;
  const port = jsonStr.port;
  const connectCode = getConnectCode(addr, port);

  const maxConnections = jsonStr.maxconnections;
  const connected = jsonStr.connected;
  const platform = converter.platformToZh(jsonStr.platform);
  const season = converter.seasonToZh(jsonStr.season);
  let intent = jsonStr.intent;
  intent = converter.modeToZh(intent)

  const players = jsonStr.players;
  const playerList = await getPlayerListAsync(players);

  const modsInfo = jsonStr.mods_info;
  const modList = getModList(modsInfo);

  const data = jsonStr.data;
  const dayInfo = getDayInfo(data);
  const currentDay = dayInfo[1];
  const daysElapsedInSeason = dayInfo[2];
  const daysLeftInSeason = dayInfo[3];
  const totalSeasonDays = parseInt(daysElapsedInSeason, 10) + parseInt(daysLeftInSeason, 10);

  // 格式化输出字符串
  const output = `【${name}】(${platform})(${connected}/${maxConnections})\n` +
                 `【天数】${currentDay}${season}(${daysElapsedInSeason}/${totalSeasonDays})(${intent})\n` +
                 `🏆玩家列表🏆\n${playerList}\n📃模组列表📃\n${modList}\n` +
                 `直连代码：${connectCode}`;

  return output;
}

function getConnectCode(addr: string, port: string): string {
  return `c_connect("${addr}", ${port})`;
}

async function getPlayerListAsync(data) {
  const parsedData = parsePlayersData(data);
  if (parsedData.length === 0) {
    return "无";
  }
  const mergedData = await Promise.all(parsedData.map(async (item, index) => {
    const { name, prefab } = item;
    const translatedPrefab = converter.characterToZh(prefab);
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



function parsePlayersData(dataStr) {
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

function getModList(data: string[]): string {
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

function getDayInfo(dataStr : string){
  const regex = /day=(\d+),\s*dayselapsedinseason=(\d+),\s*daysleftinseason=(\d+)/;
  const match = dataStr.match(regex);
  
  return match
}



async function processSimpleInfoAsync(ctx: Context,userId:string,data: any[]) {
  let result = '';
  let rowIds = []
  data.forEach((item, index) => {
    let { name, connected, maxconnections, season, mode , rowId} = item;
    season  = converter.seasonToZh(season)
    mode = converter.modeToZh(mode)
    result += `${index + 1}.${name}(${connected}/${maxconnections})${season}(${mode})\n`;
    rowIds.push(rowId)
  });
  if ( (await   ctx.database.get('dstinfo', {name: userId})).length === 0){
    ctx.database.create('dstinfo', {
      name: userId,
      info: JSON.parse(JSON.stringify(rowIds)),
    });
  }else{
    ctx.database.set('dstinfo',{name : userId},{
      name: userId,
      info: JSON.parse(JSON.stringify(rowIds)),
    })
  }
  return result;
}