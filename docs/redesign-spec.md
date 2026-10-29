# 三站重做规范：从技术数据库 → 玩家游戏资料站

适用：supermarketsimulator.wiki、repogamedb.com、tcgshopdb.com（三站共用同一套信息架构与视觉系统，只换识别色、分类与素材）。
状态：P0 已批准，按本文件落地。所有页面仍由各仓库的 `pipeline/site.mjs` 静态生成，内容来自 `content/`，不引入服务器或框架。

---

## 1. 为什么重做

现状（已现场审查线上页面）把"内部技术数据"当成首屏内容：

- 三个首页第一屏突出 schema / IL2CPP / Assembly-CSharp / unknown 与大数字（类数、字段数、命名空间数）。
- 一级导航第一位就是 Classes / Fields / Namespaces；Supermarket 的 Classes 首行是 `<Module>` 等内部类型，REPO/TCG 列表是 enum/unknown 表格。
- 词条页有事实与证据意识，但视觉上是黑底纯文字工具页：没有游戏身份、没有实体图片、没有玩家任务入口。

结论：技术数据是本站的**证据层**，不是**玩家层**。必须拆开，且玩家层要像"游戏资料站"，不像"反射工具"。

## 2. 两个内容层（硬边界）

| 层 | 内容 | 呈现 | 索引 |
| --- | --- | --- | --- |
| 玩家层 | 词条（实体）、攻略文章、分类页、首页、更新、工具 | 图片、卡片、玩家语言、窄版心 | index, follow |
| 证据层 | 类/字段/命名空间/枚举/值表、来源与哈希、提取方法 | 等宽表格、纯文字、无卡片 | noindex, follow |

规则：
1. 玩家层页面**不出现** `class / classes / field / fields / schema / IL2CPP / metadata / Assembly-CSharp / namespace / enum / parser / unknown` 这类词（现有 content-gate 已禁止其中多数）。
2. 玩家层页面不显示"类型数量/字段数量/解析器术语"等构建统计。
3. 证据层只能从页脚"技术参考"与 `/reference/` 进入；玩家页面正文不得链接到证据层（词条内的证据保留为"已按游戏文件核实"一句，不带标识符）。
4. 证据层页面一律 `noindex, follow`，不进 sitemap。

## 3. 信息架构

### 3.1 一级导航（五档，固定顺序）

1. 游戏指南 `/guide.html`
2. 实体资料 `/entities/`
3. 攻略文章 `/articles/`
4. 工具 `/tools/`
5. 更新 `/updates.html`

页脚：About · Contact · Privacy · Terms · Disclaimer · Sources · **Technical reference**（证据层唯一入口）。

### 3.2 首页模块顺序（必须按此顺序）

1. **首屏**：游戏名 + 识别色主视觉（游戏 logo 或合规本地素材）、版本徽标、搜索框（占位文案按站定制，例如"查商品、货架、顾客或攻略"）、三个玩家 CTA：开始入门 / 浏览实体 / 看攻略。
2. **游戏简介与版本**：两三句"这是什么游戏、本站覆盖什么"，带版本徽标与"只写游戏确认过的内容"一句。
3. **热门实体图文网格**：6–8 张**带游戏实图**的词条卡片（图 + 玩家标题 + 一行事实）。
4. **按玩家问题的攻略**：4–6 张攻略卡片，每张带玩家问题（来自 `data/guide-questions.json`，人工写的问句）+ 目标摘要 + 链接。
5. **最新更新**：来自 `content/updates.json` 的最近条目（日期、标题、链接、类型）。
6. **数据来源说明**：一段"图与事实从何而来"、版本、以及指向 `/reference/` 的唯一技术入口。

### 3.3 分类（按玩家语言，不按 class/enum）

- Supermarket：商品 / 货架与库存 / 顾客 / 收银 / 员工 / 布局与装修 / 升级与执照 / 财务 / 车辆 / 经营与任务
- REPO：敌人 / 贵重物品 / 道具 / 武器与法杖 / 地图与关卡 / 撤离与商店 / 物理与抓取 / 界面
- TCG：卡牌 / 卡包 / 稀有度 / 卡组与对局 / 货架与库存 / 顾客与交易 / 价格与市场 / 升级与执照 / 店面与布置

每张分类页必须有：封面图（该分类第一张实图）、一句话说明、筛选条（按关键词筛选卡片）、卡片网格（图 + 标题 + 一行事实 + 内链）、以及"暂无确认图片的条目"折叠区（指向 reference 注记页，不伪装成完整词条）。

## 4. 词条模板（玩家层）

自上而下：

1. 大图（第一张游戏实图，`aspect-ratio` 固定，懒加载）。
2. 玩家标题 + 分类徽标 + 版本徽标。
3. **30–60 字事实摘要**（取第一条已核实事实的 claim，天然是短句）。
4. 完整摘要（现有 `summary`，作为导语）。
5. 速览面板：分类 / 图片出处（游戏实图 + 资产名）/ 相关词条数 / 适用版本 / 来源。
6. "游戏确认了什么"：事实列表（每条 claim，不带标识符）。
7. "在游戏里怎么用"：`body` 段落。
8. 相关词条（内链卡片）。
9. 版本与来源（一句话，指向 reference）。

**没有确认图片的条目**：不生成 `/entries/<id>.html`，改为生成 `/reference/notes/<id>.html`（noindex），页面顶部明确写"尚无已确认的游戏图片，本页为资料注记，不计入实体资料"；分类页只以文字注记形式列出它。它们保留原始 diagram 与"非游戏截图"声明。

## 5. 视觉系统

- 深色高对比保留，但每站有独立识别色：
  - supermarket：`#3ecf8e`（生鲜绿）；repo：`#ff5c5c`（危险红）；tcg：`#8b7cff`（镭射紫）。
- 变量：`--bg #0f1116`、`--panel #171a21`、`--line #262b36`、`--ink #e9edf5`、`--dim #9aa3b2`、`--accent`。
- 版心 `max-width: 68rem`，正文列最宽 `44rem`。
- 卡片：`border-radius 14px`、1px 边框、hover 提升、图片 `aspect-ratio: 16/10; object-fit: cover`。
- 导航：粘顶、当前页高亮、移动端折叠为两行滚动条。
- 响应式断点 `720px`：网格 1 列，导航换行。
- 无第三方字体、无跟踪脚本；图片一律懒加载并带 `alt`。

## 6. 实现计划

**Phase 1（本轮，可审查）**
- A. 规范入库（本文件）。
- B. `pipeline/site.mjs`：主题变量与识别色、五档导航、页脚技术入口、首页六模块、`/entities/` 枢纽与分类页、词条模板、diagram-only 词条改路由到 `/reference/notes/`。
- C. `content/updates.json`、`data/guide-questions.json` 两份小数据文件（人工维护）。
- D. 更新 `tests/site.test.mjs` 到新契约；跑 `content-gate`/`coverage`/`image-coverage`/`tests`/`tsc`/`preflight`。
- E. 构建 + 截图（首页、分类页、词条页各一张）+ 提交。

**Phase 2（下一轮起）**
- 三站逐站复制 Phase 1；把证据层页面迁到 `/reference/` 子路径并留 noindex 跳转桩。
- 分类页筛选细化（按子话题标签）、"热门实体"按真实热度排序（有数据后再做，不编造）。
- 补图：把 diagram-only 词条逐条换成确认的游戏实图，或按 draft 存档并在 coverage 中标注为缺口。

**Phase 3**
- coverage matrix 与文章扩充；每站补齐缺图分类（当前缺口见附录）。
- 发布链（GitHub Actions + Cloudflare Pages）在有凭据后执行。

## 7. 验收标准（Phase 1）

1. 首页不含 `schema/IL2CPP/Assembly-CSharp/class/field/namespace` 字样，不含类数/字段数。
2. 首页按 §3.2 顺序出现六个模块，且热门实体网格的每张卡片都有 `<img>`。
3. 一级导航恰好五档且顺序为 §3.1；`/reference/` 只出现在页脚。
4. `/entities/` 与其分类页存在，每页至少一张实图、至少一个内链、至少一个筛选控件。
5. game-image 词条在 sitemap 中；diagram-only 词条不在 sitemap，页面为 noindex 且标注"尚无确认图片"。
6. `content-gate` 0 违规；`coverage` 无质量失败；站点测试全过；`preflight` 11/11。
7. 每站留下一张首页截图与一张词条截图，作为评审证据。

---

## 附录 A：站点参数

| 站 | 识别色 | 玩家分类数 | 现有 game-image / diagram-only | 无实图分类（Phase 3 补图目标） |
| --- | --- | --- | --- | --- |
| supermarketsimulator.wiki | #3ecf8e | 15（现 Shop 等） | 56 / 30 | FAQ、Glossary、Multiplayer、Tasks、Versions |
| repogamedb.com | #ff5c5c | 20 | 89 / 44 | Ammo、Behaviour、Co-op、FAQ、Glossary、Versions |
| tcgshopdb.com | #8b7cff | 14 | 52 / 33 | Decks、FAQ、Glossary、Versions |

## 附录 B：不做的事

- 不伪造图片、不把示意图当截图、不给未验证数字。
- 不把技术表格换皮成"卡片"继续留在玩家页面；它们属于证据层。
- 不为凑分类页而编造实体；分类下没有实图词条时，允许只显示注记并标明缺口。
