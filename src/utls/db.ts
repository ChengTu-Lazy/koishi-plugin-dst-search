import { Context } from "koishi";
import { Config } from "../index";
import * as dataUtl from './data'

export async function updateDbRegionInfoAsync(ctx: Context) {
  try {
    const regionJson = await ctx.http.get('https://lobby-v2-cdn.klei.com/regioncapabilities-v2.json');
    const x = await ctx.database.get('dstinfo', { id: 1 });

    if (x.length === 0) {
      await ctx.database.create('dstinfo', {
        id: 1,
        name: 'RegionInfo',
        info: regionJson,
      });
    } else {
      await ctx.database.set('dstinfo', { id: 1 }, {
        name: 'RegionInfo',
        info: regionJson,
      });
    }
  } catch (err) {
    // console.error('Failed to update DbRegionInfo');
  }
}

export async function updateDbRoomSimpleInfoAsync(ctx: Context,config: Config): Promise<void> {
  try {
    const results = []
    for (const SearchName of config.DefaultSearchName) {
      let result = await dataUtl.getRoomSimpleInfoAsync(ctx,SearchName)
      // console.log(result);
      if (!result) {
        // console.log(result);
        await updateDbRoomSimpleInfoAsync(ctx,config)
        result = await dataUtl.getRoomSimpleInfoAsync(ctx,SearchName)
      }
      results.push(result)
    }
    if(results){

      const x = await ctx.database.get('dstinfo', { id: 2 });
      
      if (x.length === 0) {
        await  ctx.database.create('dstinfo', {
          id: 2,
          name:"RoomSimpleInfo",
          info: JSON.parse(JSON.stringify(results.slice(0, 10))),
        });
      } else {
        await ctx.database.set('dstinfo', { id: 2 }, {
          name: 'RoomSimpleInfo',
          info: JSON.parse(JSON.stringify(results.slice(0, 10))),
        });
      }
    }
    // console.log('默认房间信息获取成功');
  } catch (err) {
    // console.error('Failed to update  DbRoomSimpleInfo');
  }
}

export async function updateDbRoomDetailInfoAsync(ctx: Context,config: Config): Promise<void> {
  try {
    const names = dataUtl.getNames(await getDbRoomSimpleInfoAsync(ctx))
    const rowIds = await dataUtl.getRowIdsAsync(ctx,names)
    const results = await dataUtl.getRoomDetailInfoByRowIdsAsync(ctx,config,rowIds)
    
    if((await ctx.database.get('dstinfo',{id:3})).length === 0){
      ctx.database.create('dstinfo', {
        id: 3,
        name: 'RoomDetailInfo',
        info: JSON.parse(JSON.stringify(results)),
      });
    }
    else{
      ctx.database.set('dstinfo',{id:3},{
        name: 'RoomDetailInfo',
        info: JSON.parse(JSON.stringify(results)),
      })
    }
  } catch (err) {
    // console.error('Failed to update DbRoomDetailInfo');
  }
}

export   async function getDbRoomSimpleInfoAsync(ctx: Context): Promise<any> {
    try {
      const result = await ctx.database.get('dstinfo', {id:2});
      return result[0].info;
    } catch (err) {
      console.error('Failed to get DbRoomSimpleInfo');
      return null;
    }
}

export async function getDbLobbyRegionsAsync(ctx: Context): Promise<string[]> {
  return new Promise((resolve, reject) => {
    ctx.database.get('dstinfo', {id:1})
      .then((result: any) => {
        if (result.length === 0) {
          return updateDbRegionInfoAsync(ctx)
            .then(() => {
              return ctx.database.get('dstinfo',{id: 1});
            });
        } else {
          return result;
        }
      })
      .then((result: any) => {
        const regions = result[0].info.LobbyRegions.map((x: { Region: string }) => x.Region);
        regions.sort((a: string, b: string) => {
          if (a === 'ap-east-1') {
            return -1;  // 如果 a 是 ap-east-1，排在前面
          } else if (b === 'ap-east-1') {
            return 1;   // 如果 b 是 ap-east-1，排在前面
          } else {
            return 0;   // 其他情况不需要改变元素顺序
          }
        });
        resolve(regions);
      })
      .catch((err) => {
        console.error('Failed to get lobby regions');
        reject([]);
      });
  });
}

export async function getDbRoomDetailInfo(ctx: Context): Promise<any> {
    try {
      const result: any = await ctx.database.get('dstinfo', {id:3});
      return result[0].info
    } catch (err) {
      console.error('Failed to get DbRoomDetailInfo');
      return [];
    }
}

