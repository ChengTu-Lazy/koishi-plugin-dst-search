import { Context } from 'koishi';
import * as dbAPI from './db'
import { Config } from '..';

export async function getRoomSimpleInfoAsync(ctx: Context, searchName: string): Promise<JSON> {

  const result: any[] = [];
  const regions : string[]= await dbAPI.getDbLobbyRegionsAsync(ctx)
  for (const region of regions) {
    const url = `https://lobby-v2-cdn.klei.com/${region}-Steam.json.gz`;
    const response = await ctx.http.get(url);
    const resultTemp = response.GET
      .filter((item: any) => item.name.includes(searchName))
      .map((item: any) => ({
        name: item.name,
        mode: item.intent,
        rowId: item.__rowId,
        season: item.season,
        maxconnections: item.maxconnections,
        connected: item.connected,
        version: item.v,
      }));
    if (resultTemp.length !== 0) {
      result.push(...resultTemp);
    }
    if (result.length >= 10) {
      break;
    }
  }
  return JSON.parse(JSON.stringify(result.slice(0, 10)));
}

export async function getRoomDetailInfoAsync(ctx: Context,token:string,rowId: string): Promise<JSON[]> {
    const dbInfos : any= await ctx.database.get('dstinfo',{name : "RoomDetailInfo"})
    if (dbInfos.length != 0) {
      for(const info of dbInfos[0].info){
        if (JSON.stringify(info).includes(rowId)) {
          return info       
        }
      }
    }
    
    const regions = await dbAPI.getDbLobbyRegionsAsync(ctx);
    for (const region of regions) {
      const url = `https://lobby-v2-${region}.klei.com/lobby/read`;
      try {
        const response = await ctx.http.post(url, {
          "__token": `${token}`,
          "__gameId": "DST",
          "Query": {
            "__rowId": `${rowId}`
          }
        });
        return response.GET
      } catch (error) {
        //查不到的时候的报错，直接忽略
      }
    }
    // throw new Error(`Failed to get room detail info for rowId: ${rowId}`);
}

export   async function getRoomRowIdAsync(ctx: Context,name: string): Promise<string> {
    const DbRoomInfo = await dbAPI.getDbRoomSimpleInfoAsync(ctx);
    let RowId = ""
    for (const data of DbRoomInfo) {
      if (data.filter((x: any) => x.name === name).length != 0) {
        if (data.filter((x: any) => x.name === name)[0].rowId) {
          RowId = data.filter((x: any) => x.name === name)[0].rowId
          return RowId
        }
      }
    }
}

export function getNames(datas:any) {
  const names = []
  for (const data of datas) {
    names.push(data.map((item: { name: string }) => item.name))
  }
  const res =  names.reduce((acc, cur) => acc.concat(cur), [])
  return res
}

export async function getRowIdsAsync(ctx: Context,names : string[]) {
    const rowIds = []
    
    for (const name of names) {
      const rowId = await getRoomRowIdAsync(ctx,name);
      rowIds.push(rowId);
    }
    return rowIds
}

export async function getRowIdByArrayAsync(ctx: Context, rowIds : string[],index : number) {
  let rowId = ""
  rowId = rowIds[index-1]
  return rowId
}

export async function getResultsAsync(ctx: Context,config: Config,rowIds: string[]) {
    const results = []
    for (const rowId of rowIds) {
        const result = await getRoomDetailInfoAsync(ctx,config.Token,rowId);
        results.push(result)
    }
    return results
}

