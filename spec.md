# 个人自律习惯追踪项目规格

> 版本：2.0  
> 修订日期：2026-11-04  
> 本文件是项目唯一规格来源。每次开发前必须先阅读本文件，不得自行增加功能、依赖或改变既定行为。需要变更时，先确认并更新本文件，再实施。

## 1. 项目概述

单用户习惯追踪网站，部署在公网 VPS，支持桌面和手机浏览器，并可添加到主屏幕。

产品只做正向记录：记录已经做到的事情，不设置失败标记、完成率、软目标或追责提醒。统计仅呈现累计、趋势、连续天数和最近记录时间等中性或正向信息。

一期不包含：注册、多用户、社交、通知、离线模式、数据导入和原生移动应用。

## 2. 技术栈与依赖

- Next.js 15 App Router、React、TypeScript，依赖版本通过 `package-lock.json` 锁定。
- Tailwind CSS、shadcn/ui、Lucide 图标，neutral 为中性基色。
- Prisma CLI 与 `@prisma/client` 必须使用完全相同的锁定版本，数据库为 PostgreSQL 16。
- Recharts：趋势图。
- next-themes：暗色模式。
- Zod：服务端输入校验。
- `@dnd-kit/core`、`@dnd-kit/sortable`、`@dnd-kit/utilities`：设置页拖拽排序，同时提供上移/下移操作。
- Vitest：单元测试和 API/数据库集成测试。
- tsx：开发依赖，用于执行 `prisma/seed.ts`。
- Node.js 22 LTS。
- GitHub Actions 构建镜像并推送 GHCR；VPS 使用 Docker Compose 运行 `web / db`，并通过已有的 Nginx Proxy Manager（NPM）反向代理和 HTTPS。
- 日期时间使用 JavaScript、`Intl` 和项目内统一的 `lib/date.ts`，不新增日期库。

## 3. 配置与密钥

应用环境变量：

| 变量 | 用途 |
|---|---|
| `DATABASE_URL` | PostgreSQL 连接串 |
| `APP_PASSWORD` | 单用户登录密码，至少 12 个字符 |
| `AUTH_SECRET` | 会话 HMAC 密钥，至少 32 字节随机值 |
| `APP_ORIGIN` | 站点规范源，例如 `https://habit.example.com`，末尾无 `/` |
| `TZ` | 固定为 `Asia/Shanghai` |

生产 Compose 另使用：`DB_USER`、`DB_PASSWORD`、`APP_IMAGE`、`APP_TAG`、`DOMAIN`。

- `AUTH_SECRET` 与 `APP_PASSWORD` 必须不同，使用密码管理器或 `openssl rand -hex 32` 生成。
- 数据库密码使用十六进制等 URL 安全字符；若包含保留字符，必须在连接串中正确进行 URL 编码。
- 本地使用 `.env`，生产使用 VPS 上权限为 `600` 的 `/opt/habit-tracker/.env`。两者均不得提交 Git。
- `.env.example` 只提供变量名和无敏感信息的示例。
- 所有写操作使用的配置在服务端读取，不使用 `NEXT_PUBLIC_` 暴露秘密。
- 已有记录后不得直接修改 `TZ`；修改时区需要专门的数据迁移方案。

## 4. 认证与 Web 安全

### 4.1 登录与会话

- 单用户，无注册、无多用户。
- `/login` 只接受密码。失败时返回通用错误，不泄露配置或密码信息。
- 密码比较必须在服务端进行，并使用恒定时间比较方式，避免普通字符串直接比较。
- 登录成功后签发带过期时间的签名会话，不得使用永久固定的 `HMAC(APP_PASSWORD, AUTH_SECRET)` 作为 Cookie。
- 会话内容为 `base64url(JSON payload) + "." + base64url(signature)`。
- payload 至少包含 `{ "v": 1, "iat": issuedAt, "exp": expiresAt }`，时间使用 Unix 秒。
- 签名使用 `HMAC-SHA256`，密钥为 `AUTH_SECRET`，签名输入为编码后的 payload。
- 验证时必须使用恒定时间签名比较，并检查版本、格式和 `exp`。
- 会话有效期为 7 天，不做滑动续期；过期后重新登录。
- Middleware 需要兼容 Next.js Edge Runtime，签名验证使用 Web Crypto；Node 专用 API 不得被 Middleware 引用。

Cookie 名称为 `habit_session`，属性固定为：

- `HttpOnly`
- `Path=/`
- `SameSite=Lax`
- `Max-Age=604800`
- 生产环境必须 `Secure`，本地 HTTP 开发环境可不设置 `Secure`
- 不设置 `Domain`

登出清除 Cookie。修改 `AUTH_SECRET` 可撤销全部已签发会话。

### 4.2 路由保护

无需认证的路径仅包括：

- `/login`
- `/api/auth/login`
- `/api/auth/logout`
- `/api/health`
- `/manifest.webmanifest`、站点图标、`_next` 构建资源

其他页面和 API 均验证会话：

- 页面未登录时跳转 `/login?next=<原路径>`。
- API 未登录时返回 `401`，不得返回 HTML 登录页。
- `next` 只能是站内绝对路径，必须以单个 `/` 开头，禁止 `//` 和外部 URL。
- `/api/auth/logout` 始终清除 Cookie，即使原会话已经过期。

### 4.3 请求安全

- 所有 `POST`、`PATCH`、`PUT`、`DELETE` 请求必须校验 `Origin` 与 `APP_ORIGIN` 完全一致；本地开发允许 `http://localhost:3000`。
- 登录接口按客户端 IP 限流：15 分钟内最多 5 次失败，超过后返回 `429` 和 `Retry-After`；登录成功后清除该 IP 的失败计数。
- 一期只有一个 web 实例，限流可保存在进程内存中。客户端 IP 只信任来自 Nginx Proxy Manager 的转发头，web 容器不得直接暴露公网。
- 请求体按 JSON 解析并限制大小，所有字段使用 Zod 校验，未知字段拒绝或剥离，不得直接写入 Prisma。
- Nginx Proxy Manager 返回 `X-Content-Type-Options: nosniff` 和 `Referrer-Policy: strict-origin-when-cross-origin`。HTTPS 验证稳定后启用 HSTS。

## 5. 数据模型

```prisma
enum HabitType {
  CHECK
  QUANTITY
}

enum StreakMode {
  DAILY
  WEEKDAYS
  WEEKENDS
  CUSTOM
}

model Habit {
  id         String     @id @default(cuid())
  name       String
  type       HabitType
  unit       String?
  streakMode StreakMode @default(DAILY)
  customDays Int[]      @default([])
  sortOrder  Int        @default(0)
  archivedAt DateTime?
  createdAt  DateTime   @default(now())
  logs       HabitLog[]

  @@index([archivedAt, sortOrder])
}

model HabitLog {
  id         String   @id @default(cuid())
  habitId    String
  habit      Habit    @relation(fields: [habitId], references: [id], onDelete: Cascade)
  logDate    String
  occurredAt DateTime
  value      Int?
  note       String?
  checkKey   String?  @unique
  createdAt  DateTime @default(now())

  @@index([habitId, logDate])
  @@index([logDate])
}
```

### 5.1 Habit 约束

- `name`：去除首尾空白后长度 1–50，允许重名。
- CHECK：`unit=null`，`streakMode` 有效；QUANTITY：`unit` 必填，默认 `分钟`，长度 1–20，连续模式字段保留默认值但不参与任何计算。
- `customDays` 使用 0–6 表示周日至周六。CUSTOM 必须包含 1–7 个不重复值；其他模式必须为 `[]`。
- 新习惯追加到所有习惯的最大 `sortOrder + 1`，不能使用会冲突的统一默认值。
- 列表按 `sortOrder ASC, createdAt ASC, id ASC` 排序。
- 不允许修改习惯类型，不允许彻底删除，只能归档和恢复。

### 5.2 HabitLog 约束

- `logDate` 格式为 `YYYY-MM-DD`，由服务端根据 `occurredAt` 和 `TZ` 计算，客户端不得提交。
- `occurredAt` 存储为 UTC 时间点，展示时转换为 `Asia/Shanghai`。
- CHECK：`value=null`，`checkKey="${habitId}:${logDate}"`。
- QUANTITY：`value` 为 1–100000 的整数，`checkKey=null`，同一天允许多条。
- `note` 可空，去除首尾空白后最多 500 字符；空字符串统一保存为 `null`。
- `checkKey` 只由服务端生成，API 和 CSV 不暴露该字段。
- PostgreSQL 的唯一索引允许多个 `NULL`，因此 QUANTITY 不受 `checkKey` 唯一约束影响。
- CHECK 创建直接依赖 `checkKey` 唯一约束防止并发重复；Prisma 返回唯一冲突 `P2002` 时，API 返回 `409`。按钮防连击不能替代数据库约束。
- 除 Prisma 模型外，迁移中增加数据库 CHECK 约束：`value IS NULL OR value > 0`，以及 `(checkKey IS NULL) <> (value IS NULL)`，防止非法日志形态。
- 删除日志必须按 `id` 查询，不存在返回 `404`；API 不接受客户端用 `logDate` 代替日志 ID。

## 6. 日期与时间规则

- 所有“今天”、日期窗口、星期和连续天数均基于 `Asia/Shanghai`，不得使用浏览器所在时区改变业务归日。
- 客户端提交的 `occurredAt` 必须是带 `Z` 或明确 `+/-HH:mm` 偏移的 ISO 8601 字符串；省略时使用服务端当前时间。
- 日期时间选择器展示上海时间的年月日和时分。提交时必须转换成带偏移或 UTC 的 ISO 字符串，禁止发送无时区字符串。
- 不允许记录未来时间；为容忍客户端时钟误差，`occurredAt` 最多允许比服务端时间晚 5 分钟，但归日后的 `logDate` 仍不得晚于上海今天。
- 过去时间不设业务下限，但必须是 JavaScript 可表示的有效时间。
- 不采用“凌晨 4 点才算跨天”规则，严格按实际发生时间在上海时区归日。
- `lib/date.ts` 统一提供：上海今天、Instant 转 `logDate`、日期加减、星期计算、固定窗口生成和展示格式化。
- `YYYY-MM-DD` 是 date-only 值。其星期和日期加减使用项目统一的 UTC 日历辅助函数，禁止直接依赖运行环境的本地时区解析。

## 7. 种子数据

| 固定 ID | 名称 | type | unit | streakMode |
|---|---|---|---|---|
| `habit_seed_01` | 三餐热量差额 > 500 | CHECK | null | WEEKDAYS |
| `habit_seed_02` | 12 点前入睡 | CHECK | null | DAILY |
| `habit_seed_03` | 睡前洗澡 | CHECK | null | DAILY |
| `habit_seed_04` | 放松拉伸 | CHECK | null | DAILY |
| `habit_seed_05` | 写日记 | CHECK | null | DAILY |
| `habit_seed_06` | 运动 | QUANTITY | 分钟 | DAILY |
| `habit_seed_07` | 观影看剧 | QUANTITY | 分钟 | DAILY |
| `habit_seed_08` | 学习 | QUANTITY | 分钟 | DAILY |
| `habit_seed_09` | 读书 | QUANTITY | 分钟 | DAILY |

- 初始 `sortOrder` 为 0–8。
- Seed 按固定 ID upsert；已存在时不得覆盖用户修改后的名称、单位、排序、连续模式或归档状态。
- Seed 可重复执行且不增加记录数，不删除任何用户数据。
- `package.json` 明确配置 `prisma.seed = "tsx prisma/seed.ts"`。

## 8. 今日视图 `/`

- 顶部显示上海时区的今天日期，以及 `今日计入习惯已完成数 / 今天应打卡数`。
- 分母：未归档、今天为计入日的 CHECK 习惯数。
- 分子：上述分母范围内，今天已有 CHECK 日志的习惯数。
- 非计入日 CHECK 的打卡不计入分子和分母，避免出现完成数大于应打卡数。
- QUANTITY 不计入分子和分母。
- 主体显示未归档习惯，按规定排序。
- 非计入日的 CHECK 折叠在“今天不用记”区域，展开后仍可打卡；该记录纳入累计统计，但不增加连续天数。
- CHECK 未打卡时，点击以当前时间创建日志；已打卡时展示强调色和对勾，点击需确认后删除该条日志。
- 未打卡的 CHECK 行可展开“添加备注”，备注随打卡一并提交；已打卡后备注只读。一期不单独提供日志 PATCH，修改备注需要撤销后重新记录。
- QUANTITY 行展示当天累计值和记录次数，例如 `今天 45 分钟（2 次）`。
- 点击 QUANTITY 行打开记录弹窗：整数数值、日期时间、可折叠备注；默认当前时间，可修改。
- 弹窗内展示当天已有 QUANTITY 明细，每条可删除；删除需要确认。
- 所有操作展示提交中、成功和失败状态，禁止重复提交；成功后只刷新相关行或统计数据，不整页跳转。
- CHECK 返回 `409` 时重新获取该行状态，不显示为未处理的服务器错误。

## 9. 统计视图 `/stats`

- 窗口为 7、30、90、365 天和全部。
- 数字窗口包含今天，向前共 N 天。例如 7 天为今天及之前 6 天。
- 所有窗口起止日期均使用上海 `logDate`，不包含未来日期。
- CHECK 卡片：全局连续天数、最近一次发生时间、窗口内打卡次数。
- CHECK 的窗口内次数包含非计入日记录；连续天数不受所选窗口影响，始终使用该习惯截至今天的全部日志。
- 最近一次发生时间按 `occurredAt` 最大值确定，同时间时按 `createdAt` 最大值确定，显示为上海时间。
- QUANTITY 卡片：窗口内累计值、窗口内记录次数、按天求和的趋势折线。
- 数字窗口的 QUANTITY 趋势包含窗口内每一天，无记录日期补 0。
- `all` 窗口的次数和累计值包含截至今天的全部记录。
- `all` 趋势从该习惯最早一条日志的 `logDate` 开始到今天，中间无记录日期补 0；该习惯没有任何日志时返回空趋势数组，计数和累计值为 0。
- 已归档习惯默认不显示。开启“显示已归档”后，同时显示未归档和已归档习惯，而不是只显示已归档。
- 趋势图必须适配手机宽度，日期和数值不得遮挡；加载、空数据和请求失败状态均需呈现。

## 10. 连续天数算法

仅用于 CHECK。

输入：`streakMode`、`customDays`、该习惯全部 `logDate` 集合 `S`、上海今天 `today`。

1. `isCountedDay(date)`：DAILY 恒为 true；WEEKDAYS 为周一至周五；WEEKENDS 为周六和周日；CUSTOM 判断星期是否位于 `customDays`。
2. 若今天是计入日且 `today ∈ S`，从今天开始；否则从昨天开始。
3. 从起点向前逐日遍历：非计入日跳过；计入日且存在于 `S`，计数加一并继续；计入日但不在 `S`，停止。
4. 无记录返回 0。未来日志不得参与计算。

因此，今天是计入日但尚未打卡时，昨天及以前的连续记录会保留到今天结束；非计入日的日志不会增加连续天数，也不会打断连续天数。

单元测试必须覆盖：

- DAILY 正常、连续多天、零记录、今天未打卡但昨天已打卡。
- WEEKDAYS 周末跳过、WEEKENDS、CUSTOM 非相邻日期。
- 今天是非计入日、今天是计入日但未打卡。
- 非计入日有日志但不增加 streak。
- 跨月、跨年、闰年 2 月。
- 空集合、非法 CUSTOM 配置在输入层被拒绝。

## 11. 设置与 CSV 导出 `/settings`

- 习惯列表支持改名、修改 unit、修改 streakMode、CUSTOM 星期多选、拖拽排序、上移、下移、归档和恢复。
- CUSTOM 控件至少选择一天，显示顺序为周一至周日，存储仍使用 0=周日至 6=周六。
- 新建习惯字段：名称、类型，以及按类型显示的单位或连续模式；创建后不可修改类型。
- 排序使用一次批量请求写回完整未归档列表顺序，在数据库事务中设置连续的 `sortOrder=0..n-1`。
- 归档保留所有历史记录和原排序值；恢复归档时追加到当前列表末尾。
- 页面只提供归档，不提供彻底删除。
- CSV 导出包含全部习惯的全部日志，包括已归档习惯。
- CSV 列固定为：`习惯名,类型,logDate,occurredAt,value,note`。
- `occurredAt` 输出 UTC ISO 8601；CHECK 的 `value` 为空，QUANTITY 输出原始整数。
- CSV 使用 UTF-8 BOM 和 RFC 4180 转义，正确处理中文、逗号、双引号及换行。
- 为防止电子表格公式注入，用户可编辑的文本单元格若以可选空白后的 `= + - @` 开头，导出时在原内容前添加单引号。

## 12. API 契约

### 12.1 通用约定

- 请求和响应均使用 JSON，成功创建返回 `201`，普通成功返回 `200`，无内容删除返回 `204`。
- API 中所有非空 DateTime 字段均序列化为 UTC ISO 8601 字符串。
- 错误统一为：

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "可读错误信息"
  }
}
```

- 使用 `400` 格式错误、`401` 未认证、`403` Origin/CSRF 校验失败、`404` 资源不存在、`409` CHECK 重复、`429` 登录限流、`500` 未处理错误。
- 生产环境 `500` 不返回堆栈、SQL、环境变量或内部路径。

Habit 响应字段：

```text
id, name, type, unit, streakMode, customDays,
sortOrder, archivedAt, createdAt
```

### 12.2 接口列表

| 方法 | 路径 | 请求与响应 |
|---|---|---|
| POST | `/api/auth/login` | `{password}`；成功设置 Cookie，返回 `{ok:true}` |
| POST | `/api/auth/logout` | 清除 Cookie，返回 `{ok:true}` |
| GET | `/api/habits` | 返回今日视图所需习惯和当天日志摘要 |
| POST | `/api/habits` | `{name,type,unit?,streakMode?,customDays?}`；创建并追加到末尾 |
| PATCH | `/api/habits/[id]` | 可修改 `name/unit/streakMode/customDays/archived`，不可修改 `type` |
| PUT | `/api/habits/order` | `{ids:[...]}`；必须恰好包含所有未归档习惯 ID，无缺失、无额外项、无重复 |
| POST | `/api/logs` | `{habitId,occurredAt?,value?,note?}`；由服务端判断习惯类型并创建对应日志 |
| DELETE | `/api/logs?id=<logId>` | 删除指定日志，成功返回 `204` |
| GET | `/api/stats?window=30&includeArchived=0` | 返回统计卡片和趋势；`window ∈ 7,30,90,365,all` |
| GET | `/api/export` | 下载 CSV |
| GET | `/api/health` | 无需认证，检查进程和数据库连接 |

`GET /api/habits` 默认只返回未归档习惯；`?archived=1` 返回全部习惯。响应：

```text
{
  date: "YYYY-MM-DD",
  items: Array<Habit & {
    isCountedToday: boolean,
    today: {
      checkLogId: string | null,
      quantityTotal: number,
      quantityCount: number,
      quantityLogs: Array<{id, occurredAt, value, note}>
    }
  }>
}
```

- CHECK 的 `quantityTotal=0`、`quantityCount=0`、`quantityLogs=[]`。
- QUANTITY 的 `checkLogId=null`，`isCountedToday=false`。
- `quantityLogs` 按 `occurredAt DESC, createdAt DESC` 排列。

`POST /api/logs` 成功返回完整日志 `{id,habitId,logDate,occurredAt,value,note,createdAt}`。CHECK 重复返回 `409`，客户端随后重新获取习惯摘要。

`GET /api/stats` 响应：

```text
{
  window: "7" | "30" | "90" | "365" | "all",
  endDate: "YYYY-MM-DD",
  items: Array<{
    habit: Habit,
    check: null | {
      streak: number,
      lastOccurredAt: string | null,
      count: number
    },
    quantity: null | {
      totalValue: number,
      count: number,
      unit: string,
      trend: Array<{logDate: string, value: number}>
    }
  }>
}
```

`GET /api/health` 执行轻量数据库 `SELECT 1`：

- 正常：`200`，`{status:"ok",timestamp}`。
- 异常：`503`，`{status:"error",timestamp}`，不暴露数据库错误细节。

## 13. 视觉与交互

- shadcn/ui + Tailwind，浅色为主，暗色跟随 `prefers-color-scheme`，`next-themes` 使用 `attribute="class"`。
- 大留白、克制的圆角和极轻阴影；单一强调色用于打卡按钮、图表主色和选中态，其余以 neutral 中性色为主。
- 字体使用 Inter（`next/font`），数字使用 `tabular-nums`。
- 移动优先，base 为手机样式，`md:` / `lg:` 增强，触摸目标至少 44px。
- 所有文本在常见手机和桌面宽度内不得溢出、遮挡或导致操作按钮跳动。
- 工具按钮优先使用 Lucide 图标；不熟悉的图标提供 tooltip 和可访问名称。
- 时长仅在 `unit=分钟` 且累计值达到 60 时显示小时和分钟；余数为 0 时省略 `0 分`。其他单位显示原始累计值和单位。

## 14. PWA

`app/manifest.ts` 必须配置：

- `id: "/"`、`name`、`short_name`
- `start_url: "/"`、`scope: "/"`、`display: "standalone"`
- `background_color`、与强调色一致的 `theme_color`
- `public/icons` 下 192/512 PNG 图标，以及适用的 maskable 图标

一期不实现 Service Worker、离线缓存、后台同步和推送。只承诺 HTTPS 环境下浏览器支持的“添加到主屏幕”，不承诺所有浏览器显示安装提示。

## 15. 本地开发

- Windows 可直接使用 Docker Desktop；推荐 WSL2 + Ubuntu + Docker Desktop WSL Integration，但不是强制要求。
- Node.js 22 LTS、Git、Docker Desktop。项目放在 WSL2 时可位于 Linux 文件系统以获得更好的文件监听和构建性能。
- 不在同一 WSL 发行版中同时运行两套 Docker 服务。
- 本地 PostgreSQL 16 使用独立容器和命名卷，数据库版本与生产一致。
- 本地 `.env` 中 `APP_ORIGIN=http://localhost:3000`，`DATABASE_URL` 指向本地数据库。
- 仅本地执行 `prisma migrate dev`；初始化后执行 `prisma db seed`，连续执行两次仍只有 9 条种子习惯。
- 提交前至少运行格式化、ESLint、TypeScript 检查和 Vitest。

## 16. CI 与镜像发布

`.github/workflows/deploy.yml` 包含测试和镜像发布两个阶段。

### 16.1 测试阶段

在 pull request 和 main push 时运行：

1. Checkout、Node.js 22、`npm ci`。
2. `prisma generate`、`prisma validate`。
3. ESLint、`tsc --noEmit`。
4. 单元测试。
5. 使用 GitHub Actions PostgreSQL 16 service 执行迁移、集成测试和 seed 幂等性测试。
6. `npm run build`。

### 16.2 镜像发布阶段

- 仅在测试成功且 ref 为 `refs/heads/main` 时推送镜像。
- 权限按 job 最小化；发布 job 仅增加 `packages: write`，其他权限保持只读。
- GHCR 镜像路径必须全部转换为小写。
- 每次发布生成完整 40 位 Git SHA 标签和 `latest`；生产只使用完整 SHA 或镜像 digest，不使用 `latest`。
- 使用 Buildx 和 GHA 缓存；目标平台默认 `linux/amd64`，ARM VPS 必须改为对应平台或构建多架构镜像。
- 镜像推送失败不得部署。main 上的并发发布必须串行，避免旧工作流最后覆盖 `latest`。
- 本流程是自动测试、自动构建和人工确认后的生产部署，不通过 SSH 自动修改 VPS。

## 17. Docker 与生产服务

### 17.1 Dockerfile

- 使用多阶段构建和 `node:22-bookworm-slim` 系列基础镜像，具体补丁版本或 digest 锁定。
- `deps`：`npm ci`。
- `builder`：复制源码并执行 `npm run build`。
- 生产依赖阶段：安装锁定版本的生产依赖，确保 Prisma CLI、对应 engines、schema 和 migrations 均存在。
- `runner`：复制 `.next/standalone`、`.next/static`、`public`、`prisma` 和运行迁移所需的本地 Prisma CLI。
- `next.config.ts` 设置 `output: "standalone"`。
- 运行时使用非 root 用户。
- 禁止在容器启动时使用 `npx` 下载 Prisma 或其他依赖。
- `docker-entrypoint.sh` 只负责 `exec "$@"`，不在 web 启动时自动迁移。
- web 默认命令为 `node server.js`；迁移作为独立的一次性容器命令执行：

```bash
node node_modules/prisma/build/index.js migrate deploy
```

### 17.2 `docker-compose.prod.yml`（配合 Nginx Proxy Manager）

- `db`：PostgreSQL 16、命名卷 `pgdata`、不映射宿主机端口、配置 `pg_isready` 健康检查。
- `web`：`image: ${APP_IMAGE}:${APP_TAG}`，只加入内部 Docker 网络和已有的 `nginx-proxy-manager_default` 网络，不配置 `ports`，不暴露 3000 到宿主机。
- `web` 等待 db 健康后启动，配置重启策略和基于 Node `fetch` 的 `/api/health` 健康检查，不依赖镜像中可能不存在的 `wget`。
- 不部署独立的 Caddy/Nginx；HTTPS 证书、80/443 端口和反向代理由已有的 Nginx Proxy Manager 处理。
- 所有服务配置 JSON 日志轮转，例如 `max-size=10m`、`max-file=3`。

`docker-compose.prod.yml` 需声明外部 NPM 网络，例如：

```yaml
networks:
  default:
  npm:
    name: nginx-proxy-manager_default
    external: true
```

`web` 服务加入 `npm` 网络后，NPM 中直接转发到 `http://web:3000`。

Next.js 流式响应不依赖 WebSocket Upgrade 配置；如果使用 NPM 的“WebSockets Support”开关，打开也可，不打开不影响正常加载。

## 18. VPS 初始化与部署

### 18.1 一次性初始化

1. Ubuntu 24.04 LTS，至少 2 GB 内存，建议配置 1–2 GB Swap。
2. 域名 A 记录指向 VPS；如配置 AAAA 记录，必须确保 IPv6 同样可用。
3. 创建 sudo 用户、使用 SSH key、禁止 root 密码登录；确认新 SSH 会话可用后再启用 UFW，仅开放 22/80/443。
4. 从 Docker 官方 apt 源安装 Docker Engine 和 Compose 插件。docker 组等价于高权限，必须限制可登录用户。
5. 使用只读 packages 权限的凭证登录 GHCR，凭证文件仅所有者可读写。
6. `/opt/habit-tracker/` 放置 Compose、备份脚本和 `.env`，设置正确权限；应用源码不复制到 VPS。Nginx Proxy Manager 已在另一个容器/Compose 中运行，由你独立管理。
7. 启动 db 和 web 后，在 Nginx Proxy Manager 的 Web UI 中添加 Proxy Host：域名填你的域名，`Scheme` 选 `http`，`Forward Hostname / IP` 填 `web`，`Forward Port` 填 `3000`；打开 `Block Common Exploits`，按需启用 `WebSockets Support`，申请或上传 SSL 证书后启用 `Force SSL`。
8. 在 NPM 中完成证书配置并保存后，访问 `https://你的域名/api/health` 验证 HTTPS、反向代理和健康接口。

### 18.2 日常更新

1. 确认 GitHub Actions 全部通过，记录要部署的完整 Git SHA。
2. 在 VPS 的 `.env` 中设置 `APP_TAG=<完整SHA>`，`APP_IMAGE` 保持为全小写 GHCR 地址。
3. 拉取新镜像并执行部署前备份。
4. 确认 db 健康后，用新镜像运行一次性 `prisma migrate deploy`；失败时停止部署并检查日志。
5. 迁移成功后执行 `docker compose up -d --no-deps web`。
6. 检查容器健康、应用日志、HTTPS、登录、今日打卡和统计数据。

迁移使用新镜像内锁定版本的 Prisma CLI，不使用 `migrate dev`、`db push` 或运行时 `npx`。

## 19. 备份、迁移兼容与回滚

### 19.1 备份

- 每日使用 `pg_dump --format=custom` 备份数据库，并在每次生产迁移前额外备份。
- 备份文件不得只保存在 PostgreSQL 数据卷或同一台 VPS；至少每日加密同步到另一台主机或对象存储。
- VPS 本地保留最近 7 天，异地保留最近 30 天；备份目录不得通过 Web 暴露。
- 每月至少在临时 PostgreSQL 中实际恢复一次并验证表和记录，不得只检查备份文件存在。
- Docker 卷快照不能替代逻辑备份和恢复演练。

### 19.2 迁移策略

- Prisma 只有向前迁移，不假设存在自动 down migration。
- 需要保留回滚能力时使用 expand/contract：先添加兼容结构，再发布使用新结构的应用，确认超过回滚窗口后再删除旧字段或旧表。
- 新旧应用必须能够短暂使用同一数据库结构。
- 破坏性迁移单独发布，不与必须立即回滚的功能发布捆绑。

### 19.3 回滚

- 当上一版本与当前 Schema 兼容时，将 `APP_TAG` 改回上一完整 SHA，拉取镜像并更新 web，不执行任何迁移。
- 如果已经执行不兼容的破坏性迁移，不能直接换回旧镜像；必须按照预先验证的恢复方案处理。
- 数据库恢复可能造成备份之后的写入丢失，必须停机并明确确认，不能作为普通一键回滚。
- GHCR 和 VPS 至少保留上一稳定镜像；清理镜像前确认回滚窗口，不能依赖无参数的 `docker image prune` 管理带标签旧版本。

## 20. 测试与验收

除连续天数单元测试外，至少覆盖：

- 日期：上海归日、带偏移 ISO 解析、无时区输入拒绝、未来 5 分钟容差、跨月/跨年/闰年。
- 认证：正确/错误密码、签名篡改、过期会话、Cookie 属性、受保护 API、开放重定向阻止、Origin 校验、登录限流。
- 日志：CHECK 两个并发请求只能成功一个并返回一个 `409`；QUANTITY 同日多条成功；非法 value 和 note 被拒绝。
- 习惯：CUSTOM 校验、追加排序、批量排序事务、归档恢复、seed 重复执行幂等。
- 统计：固定窗口边界、非计入日计数、全局 streak、最近发生时间、补零、all 空趋势、包含归档。
- CSV：中文、逗号、双引号、换行、公式注入转义和归档习惯日志。
- 数据库：从空数据库执行全部迁移成功，数据库 CHECK 约束有效。
- 镜像：非 root 运行、独立迁移、启动、数据库健康检查和 `/api/health`。

发布前手工验证手机与桌面浏览器中的登录、CHECK 打卡/撤销、QUANTITY 新增/删除、CUSTOM 设置、排序、统计窗口、归档、CSV 导出、暗色模式和添加到主屏幕。

## 21. 目录结构

```text
habit-tracker/
  prisma/
    schema.prisma
    seed.ts
    migrations/
  app/
    (app)/
      page.tsx
      stats/page.tsx
      settings/page.tsx
    api/
      auth/login/route.ts
      auth/logout/route.ts
      habits/route.ts
      habits/[id]/route.ts
      habits/order/route.ts
      logs/route.ts
      stats/route.ts
      export/route.ts
      health/route.ts
    login/page.tsx
    manifest.ts
    providers.tsx
  components/
    ui/
  lib/
    prisma.ts
    auth.ts
    session.ts
    env.ts
    ip.ts
    date.ts
    streak.ts
    validation.ts
    utils.ts
  public/icons/
  tests/
    unit/
    integration/
  scripts/
    backup.sh
  middleware.ts
  Dockerfile
  docker-entrypoint.sh
  next.config.ts
  docker-compose.prod.yml
  .env.example
  .dockerignore
  .github/workflows/deploy.yml
  spec.md
```

## 22. 开发顺序

1. 初始化 Next.js、锁定依赖、配置 Prisma、环境变量校验、数据库迁移和幂等 seed。
2. 编写日期与连续天数测试，再实现 `lib/date.ts` 和 `lib/streak.ts`。
3. 实现认证、会话、Middleware、Origin 校验、登录限流和安全 Cookie。
4. 实现习惯与日志 API，重点验证数据库唯一约束和并发 CHECK。
5. 实现统计、CSV 和健康接口，并完成 API 集成测试。
6. 实现今日视图及完整操作状态。
7. 实现统计视图、设置页、CUSTOM 配置和可访问排序。
8. 完成视觉、响应式、暗色模式和 PWA manifest。
9. 完成 Dockerfile、Compose、NPM 网络对接、备份脚本和 GitHub Actions。
10. 本地从空数据库构建并启动生产镜像，完成迁移、健康检查、备份恢复和核心流程验收后再部署 VPS。

任何与本规格冲突的实现，以更新并确认后的本规格为准。
