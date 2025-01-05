import WebSocket from 'ws';
import { Context, Logger, Session } from 'koishi';
import { Config } from '..';
import { parse } from 'url';


export class WebsocketServer {
    Instance: WebSocket.Server;
    private clients: Map<string, WebSocket>; // 用户ID与连接的映射
    ctx: Context
    config: Config
    logger: Logger
    sessions: Map<string, Session>
    constructor(ctx: Context, config: Config, logger: Logger) {
        this.ctx = ctx;
        this.config = config;
        this.logger = logger;
        this.clients = new Map<string, WebSocket>();
    }

    CreatServer(config: Config) {
        try {
            // 创建WebSocket服务器并绑定到HTTP服务器
            this.Instance = new WebSocket.Server({ port: config.WSSPort });
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
            this.clients[token] = ws;

            this.logger.info(`用户 ${user['允许操作的用户']} 服务器 已连接`);
            user.连接状态 = true;
            config.WSSUserList[config.WSSUserList.indexOf(user)] = user;

            // 监听消息事件
            ws.on('message', (message) => {
                this.logger.info(`用户 ${user['允许操作的用户']} 服务器 收到消息: ${message} `);
                // 获取对应的session并回复消息
                const session = this.sessions.get(token);
                if (session) {
                    session.send(message.toString());
                }
                // 向客户端发送回复
                ws.send(`服务端已收到: ${message}`);
            });

            // 监听关闭事件
            ws.on('close', () => {
                this.logger.info(`用户 ${user['允许操作的用户']} 服务器 已断开连接`);
                user.连接状态 = false;
                config.WSSUserList[config.WSSUserList.indexOf(user)] = user;
            });

            // 发送欢迎消息
            ws.send(`欢迎连接到DST服务器 用户 ${user['允许操作的用户']}`);
        });
    }

    // 发送消息给指定连接服务器
    public SendToClient(session: Session, message: string) {
        // 找到对应用户的token
        const user = this.config.WSSUserList.find(user => user.允许操作的用户 === session.userId);
        if (!user) {
            this.logger.warn(`未找到用户 ${session.userId} 的WebSocket配置`);
            return;
        }

        const client = this.clients[user.Token];
        if (client?.readyState === WebSocket.OPEN) {
            client.send(message);
            this.logger.info(`已发送消息给用户 ${session.userId}: ${message}`);
            this.sessions.set(user.Token, session);
        } else {
            this.logger.warn(`用户 ${session.userId} 的WebSocket连接未建立或已断开`);
        }
    }

    CloseServer() {
        this.Instance.close();
    }
}