import { Context } from "koishi";
import { Config } from "..";
import { SimpleInfoProvider, ApiSimpleInfoProvider, DbSimpleInfoProvider } from "../modules/simpleinfo-module";
import * as converter from '../utls/translators'

interface SimpleInfoType {
    name: string;
    mode: string;
    rowId: string;
    season: string;
    maxconnections: number;
    connected: number;
    version: number;
}

export class SimpleInfo {

    async getSimpleInfoAsync(ctx: Context, searchName: string, config: Config): Promise<JSON> {
        let simpleInfoProvider: SimpleInfoProvider
        if (config.DefaultSearchName.includes(searchName) || searchName === undefined) {
            simpleInfoProvider = new DbSimpleInfoProvider();
        } else {
            simpleInfoProvider = new ApiSimpleInfoProvider();
        }
        let SimpleInfos = await simpleInfoProvider.getSimpleInfosAsync(ctx, searchName);
        return SimpleInfos
    }

    async updateSimpleInfosAsync(ctx: Context, config: Config): Promise<void> {
        let SimpleInfo: any
        let result = []
        let simpleInfoProvider = new ApiSimpleInfoProvider();
        for (let searchName of config.DefaultSearchName) {
            SimpleInfo = await simpleInfoProvider.getSimpleInfosAsync(ctx, searchName)
            result.push(...SimpleInfo)
        }
        let simpleInfoJson = JSON.parse(JSON.stringify(result.flat()))
        await simpleInfoProvider.setSimpleInfosAsync(ctx, simpleInfoJson)
    }

    async getMessageAsync(ctx:Context, name:string, config:Config): Promise<string> {
        let json  = await this.getSimpleInfoAsync(ctx, name, config)
        if (JSON.stringify(json) !== "[]") {
            const simpleinfo: SimpleInfoType[] = JSON.parse(JSON.stringify(json));
            const output = simpleinfo.map((item, index) => {
                let { name, connected, maxconnections, season, mode } = item;
                season = converter.seasonToZh(season)
                mode = converter.modeToZh(mode)
                return `${index + 1}.${name}(${connected}/${maxconnections})${season}(${mode})`;
            }).join('\n');
            return `${output}\n发送“.服务器序号”查询服务器详细信息，如:“.1”`;
        }
        else{
            return "未找到该服务器！"
        }
    }

    async setUserSearchInfoAsync(ctx: Context, userId: string, json: JSON) {
        const simpleinfo: SimpleInfoType[] = JSON.parse(JSON.stringify(json));
        const rowIds: string[] = simpleinfo.map(item => item.rowId);

        const existingInfo = await ctx.database.get('dstinfo', { name: userId });
        if (existingInfo.length === 0) {
            ctx.database.create('dstinfo', {
                name: userId,
                info: JSON.parse(JSON.stringify(rowIds)),
            });
        } else {
            ctx.database.set('dstinfo', { name: userId }, {
                name: userId,
                info: JSON.parse(JSON.stringify(rowIds)),
            });
        }
    }

    async getImageAsync(ctx: Context, str: string) {
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
}