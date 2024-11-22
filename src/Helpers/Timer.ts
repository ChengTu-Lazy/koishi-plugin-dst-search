import { Context } from "koishi";
import { Config } from "..";
import { UpdateHelper } from "./UpdateHelper";

export class Timer {
    ctx: Context
    config: Config
    StaticValue: any;
    constructor(ctx: Context, config: Config) {
        this.ctx = ctx;
        this.config = config;
    }
    Task1: NodeJS.Timeout;
    Task2: NodeJS.Timeout;
    Task3: NodeJS.Timeout;
    async doTaskAsync(task: () => Promise<void>) {
        const updateHelper = new UpdateHelper(this.ctx, this.config);
        await task.call(updateHelper, this.ctx, this.config);
    }
}
