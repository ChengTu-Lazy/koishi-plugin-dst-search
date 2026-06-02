import WebSocket, { WebSocketServer as WSServer } from 'ws';
import { Context, Logger, Session } from 'koishi';
import { Config } from '..';
import { parse } from 'url';

export interface ClientCapability {
    type: 'dst-ws-client.capabilities'
    version?: number
    defaultCluster?: string
    clusters?: Array<{
        Name?: string
        name?: string
        Worlds?: string[]
        worlds?: string[]
        Running?: boolean
        running?: boolean
    }>
    actions?: Record<string, {
        description?: string
        aliases?: string[]
        usage?: string
        textArg?: string
    }>
    aliases?: Record<string, string>
    clusterAliases?: Record<string, string>
}

export class WebsocketServer {
    Instance: WSServer;
    private clients: Map<string, WebSocket>; // 用户ID与连接的映射
    private capabilities: Map<string, ClientCapability>;
    ctx: Context
    config: Config
    logger: Logger
    sessions: Map<string, Session>
    constructor(ctx: Context, config: Config, logger: Logger) {
        this.ctx = ctx;
        this.config = config;
        this.logger = logger;
        this.clients = new Map<string, WebSocket>();
        this.capabilities = new Map<string, ClientCapability>();
        this.sessions = new Map<string, Session>();
    }

    CreatServer(config: Config) {
        try {
            // 创建WebSocket服务器并绑定到HTTP服务器
            this.Instance = new WSServer({ port: config.WSSPort });
        } catch (error) {
            this.logger.error('WebSocket 服务器启动失败: %s', error);
            return;
        }
        this.logger.info('WS 开始监听 %d 端口', config.WSSPort);
        this.EventInit(config);
        return this.Instance;
    }

    private EventInit(config: Config) {
        // 监听连接事件
        this.Instance.on('connection', (ws, req) => {
            const query = parse(req.url || '', true).query;
            const token = query.token as string; // 假设用户ID通过查询参数传递

            const user = config.WSSUserList.find(user => user.Token === token);
            if (!user) {
                ws.close(1008);
                return;
            }

            // 添加客户端到Map
            this.clients.set(token, ws);

            this.logger.info(`用户 ${user['允许操作的用户']} 服务器 已连接`);
            user.连接状态 = true;
            config.WSSUserList[config.WSSUserList.indexOf(user)] = user;

            // 监听消息事件
            ws.on('message', (message) => {
                const text = message.toString();
                if (this.tryHandleCapability(token, user, text)) {
                    ws.send('服务端已收到: capability');
                    return;
                }

                this.logger.info(`用户 ${user['允许操作的用户']} 服务器 收到消息: ${text} `);
                // 获取对应的session并回复消息
                const session = this.sessions.get(token);
                if (session) {
                    session.send(text);
                }
                // 向客户端发送回复
                ws.send(`服务端已收到: ${text}`);
            });

            // 监听关闭事件
            ws.on('close', () => {
                this.logger.info(`用户 ${user['允许操作的用户']} 服务器 已断开连接`);
                user.连接状态 = false;
                config.WSSUserList[config.WSSUserList.indexOf(user)] = user;
                this.capabilities.delete(token);
            });

            // 发送欢迎消息
            ws.send(`欢迎连接到DST服务器 用户 ${user['允许操作的用户']}`);
        });
    }

    // 发送消息给指定连接服务器
    public SendToClient(session: Session, token: string, message: string) {
        const client = this.clients.get(token);
        if (client?.readyState === WebSocket.OPEN) {
            client.send(message);
            this.logger.info(`已发送消息给用户 ${session.userId}: ${message}`);
            this.sessions.set(token, session);
        } else {
            this.logger.warn(`用户 ${session.userId} 的WebSocket连接未建立或已断开`);
        }
    }

    public ResolveClientCommand(token: string, command: string) {
        const text = command?.trim();
        if (!text) return command;

        const capability = this.capabilities.get(token);
        const mapped = capability?.aliases?.[text];
        return mapped || command;
    }

    public FormatClientCommands(token: string) {
        const capability = this.capabilities.get(token);
        if (!capability?.actions || Object.keys(capability.actions).length === 0) {
            return '该服务器尚未上报可用指令，请确认 dst-ws-client 已连接并使用最新版本。';
        }

        const lines = ['当前 dst-ws-client 可用功能：'];
        const actionNames = Object.keys(capability.actions).sort();
        for (const action of actionNames) {
            const item = capability.actions[action] || {};
            const aliases = (item.aliases || [])
                .filter((alias) => alias && alias !== action)
                .slice(0, 8);
            const aliasText = aliases.length ? `（${aliases.join(' / ')}）` : '';
            const usageText = item.usage ? ` ${item.usage}` : '';
            lines.push(`- ${action}${usageText}${aliasText}: ${item.description || '无描述'}`);
        }

        const clusters = capability.clusters || [];
        if (clusters.length) {
            lines.push('');
            lines.push('客户端发现的存档：');
            for (const cluster of clusters) {
                const name = cluster.name || cluster.Name || '';
                const worlds = cluster.worlds || cluster.Worlds || [];
                const running = cluster.running ?? cluster.Running;
                lines.push(`- ${name}${worlds.length ? ` (${worlds.join(', ')})` : ''}${running ? ' 运行中' : ''}`);
            }
        }

        if (capability.defaultCluster) {
            lines.push('');
            lines.push(`默认存档：${capability.defaultCluster}`);
        }
        return lines.join('\n');
    }

    private tryHandleCapability(token: string, user: any, text: string) {
        const trimmed = text.trim();
        if (!trimmed.startsWith('{')) return false;

        let payload: ClientCapability;
        try {
            payload = JSON.parse(trimmed);
        } catch {
            return false;
        }
        if (payload?.type !== 'dst-ws-client.capabilities') return false;

        this.capabilities.set(token, payload);
        const actionCount = Object.keys(payload.actions || {}).length;
        const clusterCount = payload.clusters?.length || 0;
        this.logger.info(`用户 ${user['允许操作的用户']} 服务器 已同步 ${actionCount} 个客户端功能，${clusterCount} 个存档`);
        return true;
    }

    CloseServer() {
        this.Instance.close();
    }
}
