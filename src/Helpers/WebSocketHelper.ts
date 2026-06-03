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
        DisplayName?: string
        displayName?: string
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

interface ChatBridgeEvent {
    type: 'dst-ws-client.chat'
    cluster?: string
    world?: string
    user?: string
    text?: string
}

interface ChatBridgeBinding {
    session: Session
    cluster: string
    channelKey: string
}

export class WebsocketServer {
    Instance: WSServer;
    private clients: Map<string, WebSocket>; // 用户ID与连接的映射
    private capabilities: Map<string, ClientCapability>;
    ctx: Context
    config: Config
    logger: Logger
    sessions: Map<string, Session>
    private chatBindings: Map<string, ChatBridgeBinding>
    constructor(ctx: Context, config: Config, logger: Logger) {
        this.ctx = ctx;
        this.config = config;
        this.logger = logger;
        this.clients = new Map<string, WebSocket>();
        this.capabilities = new Map<string, ClientCapability>();
        this.sessions = new Map<string, Session>();
        this.chatBindings = new Map<string, ChatBridgeBinding>();
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
                if (this.tryHandleChatEvent(token, text)) {
                    ws.send('服务端已收到: chat');
                    return;
                }
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
        this.SendRawToClient(token, message);
        this.logger.info(`已发送消息给用户 ${session.userId}: ${message}`);
        this.sessions.set(token, session);
    }

    public SendRawToClient(token: string, message: string) {
        const client = this.clients.get(token);
        if (client?.readyState === WebSocket.OPEN) {
            client.send(message);
            return true;
        } else {
            this.logger.warn(`Token ${token} 的WebSocket连接未建立或已断开`);
            return false;
        }
    }

    public IsClientConnected(token: string) {
        return this.clients.get(token)?.readyState === WebSocket.OPEN;
    }

    public EnableChatBridge(session: Session, token: string, cluster: string) {
        const resolvedCluster = cluster?.trim() || this.capabilities.get(token)?.defaultCluster || '';
        this.chatBindings.set(token, { session, cluster: resolvedCluster, channelKey: sessionChannelKey(session) });
        this.SendRawToClient(token, JSON.stringify({
            type: 'dst-search.chat-control',
            enabled: true,
            cluster: resolvedCluster,
        }));
    }

    public DisableChatBridge(token: string) {
        this.chatBindings.delete(token);
        this.SendRawToClient(token, JSON.stringify({
            type: 'dst-search.chat-control',
            enabled: false,
        }));
    }

    public HandleBridgeGroupMessage(session: Session) {
        if (session.userId === session.selfId) return false;
        const currentChannelKey = sessionChannelKey(session);
        const bindingEntry = [...this.chatBindings.entries()].find(([, binding]) => {
            return binding.channelKey === currentChannelKey;
        });
        if (!bindingEntry) return false;

        const text = plainSessionText(session.content);
        if (!text || isControlLikeMessage(text)) return false;

        const [token, binding] = bindingEntry;
        const groupName = (session as any).guildName || (session as any).channelName || session.channelId || session.guildId || '沙盒';
        const nickname = session.username || session.userId;
        const formatted = `【${groupName}】【${nickname}】（${session.userId}）：${text}`;
        this.SendRawToClient(token, JSON.stringify({
            type: 'dst-search.chat-send',
            cluster: binding.cluster,
            text: formatted,
        }));
        return true;
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
        lines.push('- 开启对话（开启聊天 / 打开对话 / 打开聊天）: 将当前群聊与 DST 聊天日志桥接，群文本会同步到游戏公告。');
        lines.push('- 关闭对话（关闭聊天 / 停止对话 / 停止聊天）: 关闭当前服务器的聊天桥接。');

        const clusters = capability.clusters || [];
        if (clusters.length) {
            lines.push('');
            lines.push('客户端发现的存档：');
            for (const cluster of clusters) {
                const name = cluster.name || cluster.Name || '';
                const displayName = cluster.displayName || cluster.DisplayName || '';
                const label = displayName && displayName !== name ? `${displayName} (${name})` : name;
                const worlds = cluster.worlds || cluster.Worlds || [];
                const running = cluster.running ?? cluster.Running;
                lines.push(`- ${label}${worlds.length ? ` (${worlds.join(', ')})` : ''}${running ? ' 运行中' : ''}`);
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
        const binding = this.chatBindings.get(token);
        if (binding) {
            this.EnableChatBridge(binding.session, token, binding.cluster);
        }
        return true;
    }

    private tryHandleChatEvent(token: string, text: string) {
        const trimmed = text.trim();
        if (!trimmed.startsWith('{')) return false;

        let payload: ChatBridgeEvent;
        try {
            payload = JSON.parse(trimmed);
        } catch {
            return false;
        }
        if (payload?.type !== 'dst-ws-client.chat') return false;

        const binding = this.chatBindings.get(token);
        const message = payload.text?.trim();
        if (!binding || !message) return true;

        const cluster = payload.cluster || binding.cluster || '默认存档';
        const world = payload.world || '未知世界';
        const user = payload.user || '未知玩家';
        binding.session.send(`【${cluster}】【${world}】【${user}】：${message}`);
        return true;
    }

    CloseServer() {
        this.Instance.close();
    }
}

function plainSessionText(content = '') {
    return content
        .replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .trim();
}

function isControlLikeMessage(text: string) {
    return /^(控房|查房|s-simple|s-detail|s-image|s-control|\|\||[.。]\d+)/.test(text.trim());
}

function sessionChannelKey(session: Session) {
    return [
        session.platform || '',
        session.guildId || '',
        session.channelId || '',
        session.guildId ? '' : session.userId || '',
    ].join(':');
}
