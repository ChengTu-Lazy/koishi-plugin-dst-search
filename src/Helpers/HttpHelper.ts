import { Context } from 'koishi'
import { Config } from '..';

export class HttpHelper {

  ctx: Context
  config: Config
  constructor(ctx: Context, config: Config) {
    this.ctx = ctx;
    this.config = config;
  }

  async GetRegionAsync() {
    try {
      const result = await this.ctx.http.get('https://lobby-v2-cdn.klei.com/regioncapabilities-v2.json');
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

  async GetSimpleInfoByPlatformAsync(platform: string) {
    let result: any[] = []
    try {
      for (const region of this.config.DefaultRgion) {
        const url = `https://lobby-v2-cdn.klei.com/${region}-${platform}.json.gz`;
        let response
        let resultTemp
        response = await this.ctx.http.get(url);
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
              platform: item.platform
            }));
        } catch (error) {

        }
        if (resultTemp.length !== 0) {
          result.push(...resultTemp);
        }
      }
      return JSON.parse(JSON.stringify(result));
    } catch (err) {
      //console.error('Failed to get SimpleInfo');
    }
  }

  async GetSimpleInfoAsync() {
    let result: any[] = []
    try {
      for (const region of this.config.DefaultRgion) {
        for (const platform of this.config.DefaultPlatform) {
          const url = `https://lobby-v2-cdn.klei.com/${region}-${platform}.json.gz`;
          let response
          let resultTemp
          response = await this.ctx.http.get(url);
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
                platform: item.platform
              }));
          } catch (error) {
            //这里是获取不到信息的平台地区
            // console.log(region,platform);
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

  async GetDetailInfoAsync(rowId: string) {
    for (const region of this.config.DefaultRgion) {
      const url = `https://lobby-v2-${region}.klei.com/lobby/read`;
      try {
        const response = await this.ctx.http.post(url, {
          "__token": `${this.config.Token}`,
          "__gameId": "DST",
          "Query": {
            "__rowId": `${rowId}`
          },
          timeout: 20000
        });
        return (response.GET)[0]
      } catch (error) {
        //查不到的时候的报错，直接忽略
      }
    }
  }

}
