# 生产环境设备配置清单（硬件 + 软件，Ops 交付版）

> 适用范围：`openplatform-api-service` + `openplatform-web`（developer-portal / admin-portal / auth-page）
> 依据：仓库内 `deploy-testing.sh`、`deploy-beta.sh`、`deploy/nginx.conf`、`deploy/ecosystem.config.js`、`openplatform-api-service/package.json` 及 Prisma 7 运行时约束。
> 本文只给规格与配置项，不含任何生产密钥。密钥必须新生成，禁止复用 beta/testing 的值。

---

## 1. 需要部署的组件

| 组件 | 形态 | 说明 |
| --- | --- | --- |
| Nginx | 系统服务 | 三个 SPA 静态站点 + 反向代理 `/openplatform/api/` → `127.0.0.1:1000`，并终止 HTTPS |
| api-service | Node 进程（PM2） | Express 网关，监听 `1000`，写 MySQL，调用 Custody 上游 |
| MySQL 8.0 | 数据库服务 | 业务库（Prisma）。承担日志写入、日/月聚合、告警扫描 |
| Redis（可选） | 缓存服务 | 单实例可用内存缓存；**一旦 API 多实例/多节点，必须用 Redis 或 MySQL 缓存** |
| developer-portal-v2 | 静态文件 | 部署到 `/web/custody-openplatform/developer-portal`，基础路径 `/openplatform/developer/` |
| admin-portal-v2 | 静态文件 | 部署到 `/web/custody-openplatform/admin-portal`，基础路径 `/openplatform/admin/` |
| auth-page | 静态文件 | 部署到 `/web/custody-openplatform/auth-page`，基础路径 `/openplatform/oauth/` |
| Prometheus（可选） | 监控 | 抓取 `/metrics`；建议与 node_exporter 一起 |

> ⚠️ 当前 `deploy-testing.sh` / `deploy-beta.sh` **只构建部署了 api-service、developer-portal、admin-portal，没有 auth-page**，而 `deploy/nginx.conf` 有 `/openplatform/oauth/` 的 location。生产必须补上 auth-page 的构建产物，否则 OAuth 授权页 404。

---

## 2. 三档配置（按业务规模选一档）

### 2.1 规格总表

| 档位 | 适用规模 | 主机 | 规格（vCPU / 内存 / 磁盘） | 带宽 | 部署形态 |
| --- | --- | --- | --- | --- | --- |
| **S 小型**（试运营/初期） | 日调用 ≤ 100 万，开发者 ≤ 300 | 1 台 | 4C / 8 GB / 200 GB SSD（≥3000 IOPS） | 5–10 Mbps | 单机：Nginx + API + MySQL |
| **M 中型**（正式生产） | 日调用 ≤ 1000 万，开发者 ≤ 3000 | 应用 1–2 台 | 8C / 16 GB / 100 GB SSD，每台 | 50 Mbps | 应用与数据库分离 |
| | | 数据库 1 台 | 8C / 32 GB / 1 TB NVMe（≥10000 IOPS） | — | |
| | | Redis（可选） | 4C / 8 GB / 50 GB | — | 多 API 实例时必需 |
| **L 大型**（高并发/高可用） | 日调用 5000 万–1 亿，开发者 1 万+ | LB/Nginx ×2 | 4C / 8 GB / 100 GB | 100 Mbps+ 或云 LB | 集群 |
| | | API ×3 起 | 8C / 16 GB / 100 GB SSD，每台 | | |
| | | MySQL 主/从各 1 | 16C / 64 GB / 2 TB NVMe（≥20000 IOPS） | — | 主从 + 定时备份 |
| | | Redis 主/从 | 4C / 16 GB / 100 GB | — | **必须** |
| | | 监控/日志 1 台 | 4C / 16 GB / 500 GB | — | Prometheus + 日志归档 |

选型原则：
- **S 档**适合灰度、少量开发者；但单机同时扛 API + MySQL，无冗余，宕机即全站不可用。
- **M 档**是正式生产的最低形态，建议应用节点直接给 2 台挂 Nginx upstream，避免单点。
- **L 档**按 API 节点线性扩容（单进程约 200–400 QPS 量级，PM2 cluster 可近线性扩展）；MySQL 是瓶颈，聚合查询和日志写入都压在主库。

### 2.2 磁盘容量估算（决定买多大盘）

日志保留策略（代码固定）：原始日志 **3 天** → 日聚合 **6 个月** → 月聚合 **5 年**；单个开发者可按套餐上调原始保留，上限 30 天。

估算公式：

```
数据库盘 ≈ 日调用量 × 单行平均字节 × 原始保留天数 × 1.3（索引+碎片）
         + 日/月聚合（通常 < 原始盘的 5%）
         + binlog（≈ 1–2 天写入量）
         + uploads 目录（单文件 ≤ 10 MB，独立盘更佳）
单行平均字节：请求/响应体全量落库，按体量取 3 KB（小报文）～10 KB（含大报文）
```

按 5 KB/行、3 天原始保留估算：

| 档位 | 日调用量 | 原始日志/日 | 原始日志峰值 | 建议 DB 盘 |
| --- | --- | --- | --- | --- |
| S | 100 万 | 约 5 GB | 约 15 GB | 200 GB |
| M | 1000 万 | 约 50 GB | 约 150 GB | 1 TB |
| L | 5000 万 | 约 250 GB | 约 750 GB | 2 TB |

> 若业务报文普遍较大（图片 base64、批量转账），按实际 `request_bytes + response_bytes` 重新估算；也可后续把原始日志改写到独立库/对象存储以减轻主库压力。

带宽粗算：`日请求数 × 平均请求+响应字节 × 2 / 86400`。100 万次/日、5 KB/次 ≈ 1 Mbps 均值，按峰值 5–10 倍留余量。

### 2.3 按角色的硬件明细

下表是给采购/虚拟化平台直接下单的粒度。S 档是单机，M/L 档按角色拆机器。

| 档位 | 角色 | 数量 | vCPU | 内存 | 系统盘 | 数据盘 | 磁盘性能 | 网络 | 冗余 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S | 一体化（Nginx + API + MySQL） | 1 | 4 | 8 GB | 100 GB SSD | 100 GB SSD | ≥3000 IOPS | 5–10 Mbps | 无 |
| M | 应用（Nginx + API） | 2 | 8 | 16 GB | 100 GB SSD | — | ≥3000 IOPS | 50 Mbps | Nginx upstream 互备 |
| M | 数据库 | 1 | 8 | 32 GB | 100 GB SSD | 1 TB NVMe | ≥10000 IOPS | 内网 ≥10 Gbps | 每日备份（无热备） |
| M | Redis（多实例时） | 1 | 4 | 8 GB | 50 GB SSD | — | ≥3000 IOPS | 内网 | 可选 |
| L | 负载均衡 / Nginx | 2 | 4 | 8 GB | 100 GB SSD | — | ≥3000 IOPS | 100 Mbps+ / 云 LB | 双活 + VIP |
| L | 应用（API） | 3 起 | 8 | 16 GB | 100 GB SSD | — | ≥3000 IOPS | 内网 ≥10 Gbps | 滚动发布 |
| L | MySQL 主 | 1 | 16 | 64 GB | 200 GB SSD | 2 TB NVMe | ≥20000 IOPS | 内网 ≥10 Gbps | 主从 |
| L | MySQL 从 | 1 | 16 | 64 GB | 200 GB SSD | 2 TB NVMe | ≥20000 IOPS | 内网 ≥10 Gbps | 异步/半同步复制 |
| L | Redis 主/从 | 2 | 4 | 16 GB | 100 GB SSD | — | ≥3000 IOPS | 内网 | 主从 + 哨兵 |
| L | 监控/日志归档 | 1 | 4 | 16 GB | 100 GB SSD | 500 GB | ≥3000 IOPS | 内网 | Prometheus + Loki/ELK |

补充说明：
- **CPU 架构**：x86_64；如用 ARM（Graviton/倚天），需确认 `bcrypt` 原生模块可用（npm 会拉取预编译包，无预编译时需 `build-essential` + `python3`）。
- **MySQL 内存**：`innodb_buffer_pool_size` 建议给到物理内存的 **60%–70%**（M 档 32 GB → 20 GB；L 档 64 GB → 40 GB）。
- **应用内存**：`max_memory_restart` 应低于单节点物理内存 / PM2 实例数 × 0.8，避免 OOM Killer。
- **磁盘类型**：数据库盘必须 NVMe/云 SSD（gp3/ESSD），**禁止普通 HDD 或低 IOPS 云盘**；日志表写入和夜间聚合都是 IO 密集型。
- **网络**：应用与数据库放在同一 VPC/可用区，内网延迟 <1 ms；跨可用区部署时 MySQL 复制与 API 访问需走内网专线。
- **上传盘**：L 档建议把 `uploads/` 单独挂一块盘或共享 NAS/对象存储，大小按凭证量估算（单文件 ≤10 MB，保留期内累计）。

---

## 3. 软件版本与端口

| 项 | 要求 | 依据 |
| --- | --- | --- |
| 操作系统 | Ubuntu 22.04 / 24.04 LTS，x86_64 | 与现有 beta/testing 一致 |
| Node.js | **22.12 LTS**（Prisma 7 要求 `^20.19 \|\| ^22.12 \|\| >=24`） | beta 主机曾因 v22.7 失败 |
| 包管理器 | API 用 **npm**；两个门户用 **pnpm ≥ 8.8**（仓库是 `pnpm-lock.yaml`）；auth-page 用 npm | 各子项目 lockfile |
| MySQL | **8.0.36+**（或 MariaDB 10.11+），`utf8mb4`，时区 `+00:00` | `@prisma/adapter-mariadb` |
| Nginx | 1.24+，启用 gzip、HTTPS | `deploy/nginx.conf` |
| PM2 | 5.x（全局安装） | `deploy/ecosystem.config.js` |
| Redis | 7.x（仅多实例/多节点时需要） | `CACHE_DRIVER=redis` |
| 构建机 | Node 22.12 + pnpm 8.8+ + npm，可在 CI 或运维机 | 前端 `vue-tsc && vite build` |

端口与访问策略：

| 端口 | 用途 | 对外 |
| --- | --- | --- |
| 443 / 80 | Nginx（HTTPS/跳转） | 公网开放 |
| 1000 | api-service | **仅本机/内网**，安全组禁止公网直连 |
| 3306 | MySQL | 仅应用节点内网 IP 白名单 |
| 6379 | Redis（如启用） | 仅内网，设密码 |
| 22 | SSH | 运维 IP 白名单 |
| 9090/9100 | Prometheus/node_exporter（可选） | 仅内网 |

**禁止**把 `/metrics`、`/health` 直接暴露到公网；在 Nginx 中对这两个 path 加内网 `allow/deny`。

### 3.1 目录规划（所有档位统一）

```
/web/custody-openplatform/
├── api-service/          # pm2 工作目录：dist/、node_modules/、prisma/、.env
│   ├── dist/
│   ├── prisma/
│   ├── uploads/proofs/   # 支付凭证（持久化/共享盘）
│   └── .env
├── developer-portal/     # developer-portal-v2 的 dist/
├── admin-portal/         # admin-portal-v2 的 dist/
├── auth-page/            # auth-page 的 dist/
└── logs/                 # pm2 + 应用日志
```

系统初始化（Ubuntu 22.04/24.04）：

```bash
apt update && apt upgrade -y
apt install -y curl git build-essential python3 nginx mysql-server redis-server ufw
timedatectl set-timezone UTC          # 与日志/聚合口径一致
timedatectl set-ntp true
```

### 3.2 Node / PM2

```bash
# Node 必须 22.12（Prisma 7 硬性要求）
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v    # 期望 v22.12.x 或更高 LTS
npm i -g pm2@5 pnpm@9
pm2 startup systemd && pm2 save
```

前端依赖用 pnpm（developer/admin portal），API 用 npm：

```bash
cd /web/custody-openplatform/api-service && npm install --production
```

### 3.3 MySQL 8.0 生产配置

`/etc/mysql/mysql.conf.d/mysqld.cnf` 关键项（以 M 档 32 GB 内存为例）：

```ini
[mysqld]
bind-address            = 0.0.0.0          # 仅内网安全组可达；单机可设 127.0.0.1
character-set-server    = utf8mb4
collation-server        = utf8mb4_0900_ai_ci
default-time-zone       = '+00:00'
max_connections         = 500              # ≥ API 实例数 × 连接数 + 余量
innodb_buffer_pool_size = 20G              # 物理内存 60%–70%
innodb_flush_log_at_trx_commit = 1         # 金融场景不牺牲持久性
innodb_log_file_size    = 2G
innodb_io_capacity      = 8000
innodb_io_capacity_max  = 16000
slow_query_log          = 1
long_query_time         = 1
log_bin                 = mysql-bin        # 备份/恢复必需
binlog_expire_logs_seconds = 604800        # 7 天
max_allowed_packet      = 64M
```

建库与账号（示例，密码由运维生成）：

```sql
CREATE DATABASE `cregis-openplatform` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'cregis_app'@'10.0.%' IDENTIFIED BY '<强密码>';
GRANT SELECT, INSERT, UPDATE, DELETE ON `cregis-openplatform`.* TO 'cregis_app'@'10.0.%';
CREATE USER 'cregis_migrate'@'10.0.%' IDENTIFIED BY '<强密码>';
GRANT ALL ON `cregis-openplatform`.* TO 'cregis_migrate'@'10.0.%';
-- 聚合/告警任务使用 GET_LOCK，需连接权限（上述账号满足）
FLUSH PRIVILEGES;
```

备份（主库 crontab）：

```bash
0 3 * * * mysqldump -ucregis_migrate -p'<密码>' --single-transaction --routines \
  cregis-openplatform | gzip > /backup/db-$(date +\%F).sql.gz
0 4 * * * find /backup -name 'db-*.sql.gz' -mtime +30 -delete
```

### 3.4 Redis（多实例/多节点时）

`/etc/redis/redis.conf`：

```ini
bind 10.0.0.10
requirepass <强密码>
maxmemory 6gb
maxmemory-policy allkeys-lru
appendonly no
```

`CACHE_DRIVER=redis` 时**必须额外安装驱动**（不在 package.json 中）：

```bash
cd /web/custody-openplatform/api-service && npm i @keyv/redis
```

### 3.5 Nginx 生产配置

在仓库 `deploy/nginx.conf` 基础上必须补齐：HTTPS、上传大小、gzip、静态缓存、metrics/health 限内网。参考：

```nginx
server {
    listen 80;
    server_name <prod-domain>;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name <prod-domain>;

    ssl_certificate     /etc/nginx/ssl/<domain>.crt;
    ssl_certificate_key /etc/nginx/ssl/<domain>.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    add_header Strict-Transport-Security "max-age=31536000" always;

    client_max_body_size 12m;          # 支付凭证单文件 10 MB + 表单开销
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    root /web/custody-openplatform;

    location /openplatform/developer/ {
        alias /web/custody-openplatform/developer-portal/;
        try_files $uri $uri/ /openplatform/developer/index.html;
    }
    location = /openplatform/developer { return 301 /openplatform/developer/; }

    location /openplatform/admin/ {
        alias /web/custody-openplatform/admin-portal/;
        try_files $uri $uri/ /openplatform/admin/index.html;
    }
    location = /openplatform/admin { return 301 /openplatform/admin/; }

    location /openplatform/oauth/ {
        alias /web/custody-openplatform/auth-page/;
        try_files $uri $uri/ /openplatform/oauth/index.html;
    }
    location = /openplatform/oauth { return 301 /openplatform/oauth/; }

    # 带 hash 的静态资源长缓存；index.html 不缓存
    location ~* /assets/.*\.(js|css|png|jpg|svg|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    location ~* /index\.html$ {
        add_header Cache-Control "no-cache";
    }

    location /openplatform/api/ {
        proxy_pass http://api_upstream/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        proxy_buffering off;            # 大响应/流式返回更稳
    }

    # 健康检查与指标仅内网
    location = /openplatform/health {
        allow 10.0.0.0/8; allow 127.0.0.1; deny all;
        proxy_pass http://api_upstream/health;
        access_log off;
    }
    location /metrics {
        allow 10.0.0.0/8; allow 127.0.0.1; deny all;
        proxy_pass http://api_upstream/metrics;
        access_log off;
    }
}

upstream api_upstream {
    server 127.0.0.1:1000;
    # M/L 档多应用节点时追加：
    # server 10.0.0.11:1000;
    # server 10.0.0.12:1000;
    keepalive 32;
}
```

> 仓库自带的 `deploy/nginx.conf` 只覆盖了 SPA fallback 与反向代理，**没有 HTTPS、`client_max_body_size`、gzip、静态缓存和 metrics 白名单**，生产不能直接原样使用。

### 3.6 PM2 生产配置

`deploy/ecosystem.config.js` 的生产版（按 8C/16 GB 应用节点示例，4 实例）：

```javascript
module.exports = {
  apps: [{
    name: 'api-service',
    script: 'dist/main.js',
    cwd: '/web/custody-openplatform/api-service',
    instances: 4,                    // S档 1；M档 2–4；L档按核数
    exec_mode: 'cluster',            // ⚠️ 必须 cluster，否则单进程
    autorestart: true,
    watch: false,
    max_memory_restart: '1500M',
    env: { NODE_ENV: 'production', PORT: 1000 },
    error_file: '/web/custody-openplatform/logs/api-service-error.log',
    out_file:   '/web/custody-openplatform/logs/api-service-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
  }],
}
```

启动/更新：

```bash
cd /web/custody-openplatform/api-service
npx prisma migrate deploy && npx prisma generate
pm2 startOrReload /web/custody-openplatform/deploy/ecosystem.config.js --update-env
pm2 save
```

> `exec_mode` 默认是 fork；不显式写 `cluster` 时 `instances: 4` 不生效。后台聚合/告警已用 `NODE_APP_INSTANCE` + `GET_LOCK` 保证只跑一次。

### 3.7 前端构建（在构建机执行）

```bash
cd openplatform-web/developer-portal-v2 && pnpm install --frozen-lockfile && npm run build
cd openplatform-web/admin-portal-v2     && pnpm install --frozen-lockfile && npm run build
cd openplatform-web/auth-page           && npm ci && npm run build
```

构建产物 `dist/` 上传到对应目录。**构建时必须使用生产 env**（`VITE_API_URL=/openplatform/api/v1`、`VITE_BASE=/openplatform/developer|admin/`、`VITE_BASE_URL` 等写死进 bundle），不要复用 beta 的 `dist/`。

### 3.8 防火墙 / 安全组

```bash
ufw default deny incoming
ufw allow 22/tcp          # 建议再限制运维源 IP
ufw allow 80,443/tcp
ufw enable
# 1000 端口不对公网开放；MySQL/Redis 仅内网安全组
```

- 云安全组：公网只放 80/443；1000/3306/6379 仅同 VPC 内网。
- MySQL、Redis、PM2 均禁止监听公网 IP。
- 所有生产密钥（`JWT_SECRET`、RSA 密钥对、DB/SMTP/Redis 密码）通过密钥管理系统或运维手工下发，**不得提交仓库**。


---

## 4. 运维必须写入生产 `.env` 的配置项

| 变量 | 必填 | 生产取值要求 |
| --- | --- | --- |
| `NODE_ENV` | ✅ | `production`（DB 初始化失败时会直接退出，避免带病启动） |
| `PORT` | ✅ | `1000` |
| `STORAGE_TYPE` | ✅ | `mysql`（否则不连库，所有功能失效） |
| `DATABASE_URL` | ✅ | 生产库连接串（Prisma CLI 迁移用） |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | ✅ | 生产库；密码含特殊字符时注意 `DATABASE_URL` 需 URL 编码 |
| `JWT_SECRET` | ✅ | **新生成** ≥32 字符随机串；禁止复用 beta/testing |
| `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` | ✅ | 用 `npx tsx scripts/generate-jwt-keys.ts` **新生成**（Base64），生产密钥不得进仓库 |
| `OPENPLATFORM_AUTH_URL` | ✅ | 生产 OAuth 地址，如 `https://<prod-domain>/openplatform/oauth/` |
| `CUSTODY_SERVICE_GATEWAY` | ✅ | 生产 Custody 上游网关地址 |
| `ENABLE_RATE_LIMIT` | ✅ | `true`（**beta/testing 当前是 false，生产必须开**） |
| `CACHE_DRIVER` | ✅ | 单实例 `memory`；多实例/多节点必须 `redis`（或 `mysql`） |
| `CACHE_REDIS_URL` / `CACHE_MYSQL_URL` | 视驱动 | 与上项配套 |
| `SMTP_HOST` / `PORT` / `SECURE` / `USER` / `PASS` / `FROM` | 建议 | 未配置时告警邮件静默不发，但告警事件仍落库 |
| `ENABLE_FILE_LOGGING` / `LOG_DIR` / `LOG_LEVEL` | 建议 | `true` / `/web/custody-openplatform/logs` / `info` |
| `API_LOG_TIMEZONE` | 可选 | 保持 `UTC`（原始日志按 UTC 切天，勿改） |
| `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` / `ISV_JWT_EXPIRES_IN` | 可选 | 默认 `2h` / `30d` / `24h` |
| `ADMIN_PASSWORD` | 初始化时 | 仅 `seed-admin` 脚本使用；首次初始化后从 env 移除 |
| `DB_POOL_SIZE` | ❌ | 代码当前未读取，属于无效配置，不要依赖它调连接池 |

初始化动作（一次性）：
1. `npx prisma migrate deploy` —— 应用全部迁移（当前最新为 `20261104000000_add_alert_log_retention`）
2. `npx prisma generate`
3. `npx tsx scripts/seed-admin.ts`（需 `ADMIN_PASSWORD`）
4. `npx tsx scripts/seed-packages.ts`
5. `npm install --production`

---

## 5. 关键运行约束（写进运维注意事项）

1. **本地时区建议设为 UTC。** 原始日志按 UTC 切天（数据库存的是 UTC 墙钟），后台聚合任务在**服务器本地时间 00:05** 触发，告警扫描每 **5 分钟**一次。服务器时区设成 UTC 可让两者口径一致，排查也简单。
2. **后台任务只能单实例执行。** 日聚合（00:05）和告警扫描（5 分钟）通过 `NODE_APP_INSTANCE` + MySQL `GET_LOCK` 互斥。MySQL 用户必须有 `GET_LOCK/RELEASE_LOCK` 权限；PM2 cluster 模式下无需额外配置。**不要绕过 PM2 手动多开多个 API 进程**。
3. **上传目录必须持久化。** 支付凭证写入 `<工作目录>/uploads/proofs`，单文件 ≤10 MB，经 Express `/uploads` 访问。容器/多节点部署必须挂共享卷或改对象存储，否则重启丢文件、多节点读不到。
4. **多实例必须换缓存驱动。** `CACHE_DRIVER=memory` 的 nonce 缓存、限流计数、登录锁定都是进程内状态；多进程/多节点下会失效。另外 `@keyv/redis`、`@keyv/mysql` **不在 package.json 依赖里**，启用时需额外 `npm i @keyv/redis`（或 `@keyv/mysql`），否则会静默回退到内存缓存。
5. **PM2 配置按机器规格调。** `deploy/ecosystem.config.js` 默认 `instances: 1`、`max_memory_restart: '500M'`。M/L 档请按核数调 `instances`（如 2–4）并把内存上限调到 1G–2G；同时统一进程名（当前 testing 脚本重启 `openplatform-api-service`，beta 脚本和 ecosystem 用 `api-service`，不一致会导致重启到旧进程）。
6. **Nginx 需要补的配置**：`client_max_body_size ≥ 10m`（上传凭证）、静态资源长缓存、API 关闭缓存、`/metrics` 与 `/health` 限内网、HTTPS 证书与 HSTS。
7. **前端是构建期注入配置。** 三个门户的 API 地址/基础路径在 `vite build` 时写死（`.env.production`），生产必须用生产 env 构建后再上传，不能复用 beta 的 dist。
8. **数据库账号最小权限**：应用账号需要业务表 DML + 临时连接权限；`prisma migrate deploy` 需要 DDL 权限，可用单独的迁移账号。

---

## 6. 上线验收清单

- [ ] `curl -s https://<domain>/openplatform/health` 返回 `status: ok`、`database: connected`
- [ ] `curl http://127.0.0.1:1000/health` 本机通、公网不通
- [ ] `/openplatform/developer/`、`/openplatform/admin/`、`/openplatform/oauth/` 三个页面可打开且刷新不 404（SPA fallback 生效）
- [ ] 登录 → 获取 token → 调用 `/openplatform/api/v1/...` 链路通
- [ ] `api_logs` 有新行写入；`response_bytes > 0`
- [ ] 手动触发一次聚合/告警检查无报错（或确认次日 00:05 日志出现 `[ApiLog]` 记录）
- [ ] `/metrics` 仅内网可访问
- [ ] pm2 `list` 显示进程 online、重启次数稳定、`save` 后开机自启已配置
- [ ] MySQL 已配置每日全备 + binlog，恢复演练通过
- [ ] 服务器 NTP 时间同步正常（日志时间/签名时间戳依赖）

---

## 7. 监控与备份

| 项 | 建议 |
| --- | --- |
| 应用存活 | 外部拨测 `/openplatform/health`（含 DB 状态），1 分钟一次 |
| 业务指标 | Prometheus 抓 `/metrics`：QPS、错误率、总请求数 |
| 系统指标 | node_exporter：CPU、内存、磁盘、网络 |
| MySQL | 慢查询日志（阈值 1s）、连接数、InnoDB buffer pool 命中率、磁盘剩余 |
| 磁盘告警 | DB 盘 ≥80% 告警（日志表是增长主因） |
| 应用日志 | 按天切割，保留 7–30 天；告警邮件失败会在日志中体现 |
| 备份 | MySQL 每日全量 + binlog 增量；`uploads/` 目录每日备份；保留 ≥30 天 |
