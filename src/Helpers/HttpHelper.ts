import { Context } from 'koishi'
import { Config } from '..';

export class HttpHelper {

  async GetRegionAsync(ctx: Context) {
    try {
      const result = await ctx.http.get('https://lobby-v2-cdn.klei.com/regioncapabilities-v2.json');
      const regions = result.LobbyRegions.map((x: { Region: string }) => x.Region);
      regions.sort((a: string, b: string) => {
        if (a === 'ap-east-1') {
          return -1;  // 如果 a 是 ap-east-1，排在前面
        } else if (b === 'ap-east-1') {
          return 1;   // 如果 b 是 ap-east-1，排在前面
        } else {
          return 0;   // 其他情况不需要改变元素顺序
        }
      });
      return regions;
    } catch (err) {
      console.error('Failed to get Regions');
    }
  }

  async GetSimpleInfoAsync(ctx: Context, config: Config) {
    let result: any[] = []
    try {
      for (const region of config.DefaultRgion) {
        for (const platform of config.DefaultPlatform) {
          const url = `https://lobby-v2-cdn.klei.com/${region}-${platform}.json.gz`;
          let response
          let resultTemp
          response = await ctx.http.get(url);
          try {
            resultTemp = ""
            resultTemp = response.GET
              .map((item: any) => ({
                name: item.name,
                mode: item.intent,
                rowId: item.__rowId,
                season: item.season,
                maxconnections: item.maxconnections,
                connected: item.connected,
                version: item.v,
              }));
          } catch (error) {

          }
          if (resultTemp.length !== 0) {
            result.push(...resultTemp);
          }
        }
      }
      return JSON.parse(JSON.stringify(result));
    } catch (err) {
      //console.error('Failed to get SimpleInfo');
    }
  }

  async GetDetailInfoAsync(ctx: Context, config: Config, rowId: string) {
    for (const region of config.DefaultRgion) {
      const url = `https://lobby-v2-${region}.klei.com/lobby/read`;
      try {
        const response = await ctx.http.post(url, {
          "__token": `${config.Token}`,
          "__gameId": "DST",
          "Query": {
            "__rowId": `${rowId}`
          }
        });
        return (response.GET)[0]
      } catch (error) {
        //查不到的时候的报错，直接忽略
      }
    }
  }

}
