# Supermarket Simulator 数据库 — 本地完成报告（Windows 端）

**状态：local_complete（本地可交付层：P0 类清单 + 站点 + 门禁 + 报告）· 未发布** · Windows Harness

> local_complete 指"本地交付层"完成，**不等于"字段也提取到了"**：本作的字段层仍是 `not-attributed`，见 §2 与 §8。
> 发布（GitHub Actions → Cloudflare）未执行：无 deploy、无域名、无 DNS、无 GSC/Bing、无 AdSense。

## 1. 游戏包与边界（已确证）
- 安装：`C:\uTorria\Downloads\Supermarket Simulator (2025)\Supermarket Simulator`（**原始数据留 Windows，不入 Git**）
- 后端 **IL2CPP**；元数据 `Supermarket Simulator_Data\il2cpp_data\Metadata\global-metadata.dat`，19,350,248 B，
  `sha256=acac0e03010dc02a976b8aafe2d8ec915e902c3681f43ab5bf82028f9bb6c4e0`，**sanity `0xfab11baf`、metadata version 39**
- 版本行：`Nokta Games | Supermarket Simulator`（`_Data/app.info`）

## 2. P0 数据
- `data/normalized/p0-schema.json`：**21,152 个类**，每条含类名、命名空间、逐条来源
  - 名字分两级置信度：**20,848** 条通过严格 C# 标识符校验（`identifier`），**304** 条为编译器生成名、保留原文并标记（`printable-raw`），实测越界字符为 `=`(296)、`-`(40)、`,`(3)、`{`(1)、`}`(1)（例：`__StaticArrayInitTypeSize=12`）。**名字缺失 0 条**
  - 命名空间：474 个具名 + 8,572 个全局（`string[16] == b''`；`namespaceIndex` 从不取 0，故不会把字符串池第 0 号 `Assembly-CSharp` 误写成命名空间）
- `data/normalized/p0-inventory.json`：站点用同形状清单；**游戏侧 11,275 类 / 引擎与第三方 9,877 类**（判据 `isEngineNamespace`，是可测试的显式前缀表）
- **字段：`fields.status = not-attributed`、`confidence = unknown`、`value = null`。** v39 的"类型→字段"成员尚未测出（82 字节条目内没有满足"非负、< 87732、单调不减、首值为 0"的 i32/u16 成员），因此**不写字段级数据**

## 3. 站点与门禁（本轮实测）
```
node pipeline/schema_to_inventory.mjs   -> [inventory] classes=21152 game=11275 engine=9877 fields=0 namespaces=474 global=8572
[site] pages=20 indexable=13 gameClasses=11275 engineClasses=9877 out=web/dist
node tests/site.test.mjs                -> [site-tests] 49 passed, 0 failed
node .../typescript/bin/tsc --noEmit -p tsconfig.json -> exit 0
git status --porcelain                  -> 空
```
HEAD `72bd034` · 22 commits · 工作区干净。

## 4. 门禁可失败性（反证，五条同时注入后实测）
故意破坏构建（`privacy.html` 不写出、`terms.html` 去掉 canonical、额外产出 `entity/x.html`、搜索载荷少一个类）后：
```
FAIL every required route is emitted :: privacy.html
FAIL no thin schema-only page is emitted for this title :: an entity directory exists, but this title has no field data to fill it
FAIL every navigation target is a page that exists :: /privacy.html
FAIL every product route carries canonical, an index directive and its source line :: terms.html
FAIL the search payload carries every game class and no engine class :: 11274 vs 11275
[site-tests] 24 passed, 5 failed          exit=1
```
还原（`git checkout -- pipeline/site.mjs`）后 29 passed / 0 failed、exit 0、工作区干净。缺路由时给出的是**干净 FAIL 与汇总行**，不是崩溃。

## 5. 可索引性策略
- **12 页可索引**（进 sitemap）：`index, search, collection, namespaces, guide, tool, sources, about, contact, disclaimer, privacy, terms`；404 为 `noindex`、不入 sitemap；每条可索引页断言含 canonical + `index, follow` + 页脚来源行
- **本作不出实体页（`/entity/*` 一个也没有）**：字段不可归属时，per-class 页面只会是"一个类名 + 100% unknown"，属于薄内容。门禁专门守护该决定：一旦出现 `entity/` 目录即 FAIL。类 schema 由**搜索 / 集合 / 命名空间**三页承载，它们确实回答查询
- `sources` 页列出文件、sha256、字节数、metadata 版本、类型表 offset/stride/count、字符串池 offset/size、提取器与置信度分层；`guide` 页明确写出"这里没有字段/数值/价格/商品表"

## 6. 未知与纪律
- 未取到的值一律 `unknown`；不推断、不填默认、不猜测
- 引擎/第三方与游戏类的划分是**显式前缀表 + 可测试判据**，两侧数量都公开（9,877 / 11,275），不隐藏
- 提取脚本先自校验锚点（sanity、版本、字符串池锚点、类型表尾哨兵位置 `15573600 + 21151×82`），任一不符即 `assert` 退出

## 7. 交接给 Mac（仅源码）
- 入 Git：`pipeline/`（含 8 个自洽性探针与提取器）、`tests/`、`data/normalized/p0-schema.json`、`data/normalized/p0-inventory.json`、`reports/`、`tsconfig.json`
- **不入 Git**：`web/dist/`（构建产物，本轮曾误提交一次，已 `git rm --cached` 并加入 `.gitignore`）、`data/raw/`
- 构建复现：`node pipeline/schema_to_inventory.mjs && node pipeline/site.mjs && node tests/site.test.mjs`

## 8. 未完成 / 阻塞（明确声明）
- **字段归属**：v39 的"类型→字段"引用未测出（下一步候选：复核 87732 是否为完整字段表、是否有 4 字节对齐的间接索引表、用方法表交叉反推成员含义）
- **images 表与 Il2CppType 表未定位**（两者的候选判据均未通过），这影响"每个程序集的类型区间"与父类解析，但不影响已发布的类名与命名空间
- 本地化：**有意只出英文单语言**（没有译文就不生成译文页）
- 反汇编工具缺失（无 dotnet、无 Il2CppDumper；AssetRipper 仅 GUI），故无法从 `GameAssembly.dll` 侧确认结构体成员顺序

## 门禁清单（第 79 轮更新）
- 站点门禁：repo 29 条、tcg 29 条、supermarket 40 条，覆盖路由与导航目标存在、每条产品路由带 canonical + 明确的 robots 指令 + 页脚来源行、sitemap 恰好列出可索引页且不含 404、404 为 noindex、来源可核（sha256 / metadata 版本 / 表几何）、逐字段来源、extracted 必须有值、搜索载荷与游戏类集合一致。
- 发布配置也受门禁：workflow 必须构建并跑测试、部署作业必须有 needs: gate、只能用 secret（仓库内不得出现令牌字面量）、Pages 项目名与输出目录已声明、无 tab 且缩进为 2 的倍数、可移植 typecheck 配置存在。
- 第 75–78 轮新增：noindex/sitemap 政策门禁（重复页与 schema 页不入索引），以及可索引页重复内容门禁（逐字符 40 字符窗口哈希后的包含度 > 0.9 即失败）。
- 该重复内容判据经三次修正才有效，三次失败都记录在测试注释里：字符 shingle 的 Jaccard 实测 0.070、词 6-gram 包含度 0.048（正文是无空白 JSON）、按 10 字符采样的包含度 0.131——都因采样相位错位而失效；改为逐字符哈希后，破坏构建实测 search.html ~ tool.html = 0.93 并触发 FAIL。
- 已证实的重复：search.html 与 tool.html 的最长公共块为 17,284 / 18,173 字符（difflib autojunk=False 比例 0.989），因此 tool.html 保留 URL 但 noindex、不入 sitemap。

## 第 75–94 轮更新（supermarket）
- **字段页体积**：`fields.html` 原为 782.7 KiB（15,236 行服务端渲染），现改为 `data/fields.json`（275.1 KiB）+ `fields.js`（0.4 KiB）前端渲染，页面本身 **2 KiB**；`<noscript>` 给出 JSON 直链。门禁同时校验载荷条目数（15,236）与页面体积（< 20 KB）。
- **门禁数 47 → 49**：新增"可索引页之间正文相似度不得超过 90%"（逐字符 40 字符窗口哈希的包含度）与"页面不得重复本项目已证伪的说法"两条；后者覆盖 `does not parse yet` / `no field is listed` / `Every field value` 三句曾经的错误表述。
- **重复内容**：`search.html` 与 `tool.html` 曾共用同一 340 KiB 载荷（最长公共块 17,284 / 18,173 字符），`tool.html` 已改为字段名查找并保留 URL 但 noindex、不入 sitemap。
- 值层：`valueLayer` = `data/normalized/p0-field-rows.json`，**170,050** 条字段行（170,271 行中名字严格解析成功者）。
