# IL2CPP 元数据 v39 —— 类型表已定位（supermarket-simulator）

**结论：类型表找到了。** 此前 `reports/il2cpp-type-table-failed.md` 的"未定位"已被推翻：那是**方法**的问题，不是文件的问题。

## 已实测事实（全部由文件自洽性得出，未套用任何版本的固定布局）
| 事实 | 值 | 证据 |
| --- | --- | --- |
| sanity / 版本 | `0xfab11baf` / **39** | `u32@0`、`i32@4` |
| 文件大小 | 19,350,248 B | — |
| 字符串池 | **off 918256, size 2865150** | 头 slot 32；唯一同时包含 `Assembly-CSharp`、`mscorlib`、`UnityEngine.CoreModule`、`MonoBehaviour`、`<Module>` 的区间，且全区间标识符产出率 **0.9911**（其它候选区间产出率 0.000–0.010，是"跨越全文件的假区间"） |
| 类型表 | **off 15573600, count 21152, 步长 82, nameIndex@+0** | 见下 |
| 字段表 | **off 11017888, count 87732, 步长 12**，nameIndex@+0 | 150 抽样中 99.3% 的 nameIndex 在字符串池内解析为合法标识符 |
| `<Module>` 字符串索引 | 40（位于 918296） | 与类型表首项 nameIndex 完全一致 |
| 哨兵名索引 | 2865113（位于 3783369） | `__Il2CppFullySharedGenericStructType` |

## 类型表的判定链（每一步都是测量，不是假设）
1. 头 slot 236 = 15573600，slot 240 = 1734464，slot 244 = 21152。
2. `1734464 = 21152 × 82`；在 78–200 的步长中，82 / 104 / 164 得**相同**的名字产出率 0.9803 → 说明"抽样名字是否合法"**不足以**定步长（该区间塞满小整数，很多都落在字符串池范围内）。这是本轮最有价值的负面结果：**必须用唯一名做定位**。
3. `<Module>` 的字符串索引只有 40，全文件作为 i32 出现 174 次 → 用它配对会得到 8 个假解。
4. `__Il2CppFullySharedGenericStructType` 的索引 2865113 在 [15573600, 15573600+1734464] 内**只出现 1 次**，位置 17307982。
5. `17307982 = 15573600 + 21151 × 82` → 条目数 21152、步长 82、nameIndex 位于条目起始处，唯一自洽。
6. 交叉验证：type[0] = `<Module>`、type[1] = `<>c__DisplayClass22_0`、type[2] = `<>c__DisplayClass23_0`，且字符串索引 40 < 672 < 713 与字符串池中类型名的排序一致。

## 未解决（下一步的精确问题）
在 82 字节条目内，**没有任何 i32 成员（偏移 0..78）同时满足"非负、< 87732、单调不减、首值为 0"**，u16 成员也没有；所有 u16 的求和都不等于 87732。即 v39 的"类型→字段"引用不是旧版 `Il2CppTypeDefinition::fieldStart` 的直接 i32 下标。

下一步候选（按可验证性排序）：
1. 类型表尾部 u16 可能就是各 count 字段，但**求和不等于字段表条目数** → 字段表 87732 这个数本身需要独立复核（可能字段被拆成两张表）。
2. 检查是否存在"字段索引间接表"：若某成员是 4 字节对齐的字节偏移量，则其值应全为 4 的倍数 —— 本轮 dump 显示 +12、+24 等成员不满足（如 25810）。（注：已知 +12=25810、+16=37092 等，见 `il2cpp_selfconsistent8.py` 的 dump。）
3. 用**方法表**（methods）做交叉：方法名索引同样可校验，若方法表能按同一方式定位，则两表的 typeStart/count 分布应互相吻合，可反推成员含义。
4. 直接读 `GameAssembly.dll` 侧对应的元数据访问函数，确认 v39 结构体成员顺序（需要反汇编工具，本机暂无）。

## 复现命令
```
python312 pipeline/il2cpp_selfconsistent4.py <global-metadata.dat>   # 定字符串池与类型表候选
python312 pipeline/il2cpp_selfconsistent7.py <global-metadata.dat>   # 用唯一名反解 count/步长
python312 pipeline/il2cpp_selfconsistent8.py <global-metadata.dat>   # dump 条目结构、试 fieldStart/fieldCount
```
（`python` 在 PATH 上是坏的 3.10.6；必须用 `C:\Users\CHEN\AppData\Local\Programs\Python\Python312\python.exe`。）

## P0 类清单已产出 —— `data/normalized/p0-schema.json`
- **21,152 个类**：20,848 条为严格 C# 标识符（confidence `identifier`），304 条为可打印原文（confidence `printable-raw`），**缺失 0 条**
  - 那 304 条是编译器生成名，实测其"越界字符"为 `=`(296)、`-`(40)、`,`(3)、`{`(1)、`}`(1)，例如 `__StaticArrayInitTypeSize=12`。没有放宽到"任意字节"，而是**降级置信度**并保留原文
- **命名空间**：474 个具名 + 8,572 个全局命名空间，未解析 0
  - 关键校验：字符串池第 0 号字符串是 `Assembly-CSharp`，若把"全局命名空间"误当索引 0 就会把它写成程序集名。实测 `string[16] == b''`（空串即全局）且 `namespaceIndex` 从不取 0，故不存在该污染
- **逐条来源**：文件路径 + `sha256=acac0e03010dc02a976b8aafe2d8ec915e902c3681f43ab5bf82028f9bb6c4e0` + 字节数 + metadata 版本 39 + 类型表 offset/stripe/count + 字符串池 offset/size + 提取方法与锚点
- 版本行：`Nokta Games | Supermarket Simulator`（`_Data/app.info`）
- **字段**：显式 `fields.status = not-attributed`、`confidence = unknown`、`value = null`（v39 未测出成员含义前不写字段级数据）
- 复现：`python312 pipeline/il2cpp_types.py <global-metadata.dat> <out.json> <app.info>`
  - 脚本**先自校验锚点**（sanity、版本、字符串池锚点、类型表尾哨兵位置），任一不符即 `assert` 退出，不会写出半成品

域内类名抽检（说明这确实是该游戏自己的类型表，而非乱码）：`<<ReorderProducts>g__Delay|48_0>d`、`<<SpawnProductOnEmptyShelf>g__Delay|11_0>d`、`<<MoveCheckoutPosition>g__MoveToCheckout|0>d`、`<<LoadSaveData>g__WaitStoreAvailability|57_0>d`。

**下一步**：把该清单接进站点生成器（复用 tcg/repo 已验证的构建 + 21 门禁），使 supermarket 从 0 页变为可交付站点；字段归属继续独立推进。

## 修正与新增（v10–v14 探针，2026 轮 71）

### 撤回：旧"字段表 off=11017888 / count=87732"不成立
我此前用"名字索引能在字符串池里解出标识符"作为判据，这个判据**几乎无效**，已实测量化：
```
随机索引（20000 次）：旧判据通过 18352/20000 = 91.8%   严格判据通过 1024/20000 = 5.12%
```
旧判据把随机整数落在密集文本池里解出的**字符串后缀**（`keryManager`、`yManager`、`er`、`t`）当成了合法名字。因此旧候选作废。
**正确判据**：真实名字索引必须指向**字符串起点**（前一字节为 NUL）。用该判据重搜后：
- 类型表（off 15573600 / stride 82 / 21152）**依然通过**：type[0]=`<Module>`、type[1]=`<>c__DisplayClass22_0`、type[21151]=`__Il2CppFullySharedGenericStructType` 全部 strict-ok

### 新发现：真正的字段表
| 项 | 实测值 | 判据 |
| --- | --- | --- |
| offset / 行宽 / 行数 | **11105620 / 12 / 170271** | 11105620 + 12×170271 = **13148872 = 下一个表的起点**（完美拼接） |
| 名字列 | +0，**100% 严格通过** | 逐位移扫描：shift=0 时 nameStrict=1.000，其它位移 0.000–0.106 |
| 第二列 | +4，IL2CPP 为每个字段分配一个 Il2CppType，故按字段顺序递增 | 前若干行严格 +1，全表非严格（合理的分配顺序） |
| 第三列 | +8，范围 0..58574 | token/属性槽 |
| 同名前缀 | 出现一次的方法表候选 | slot 56：off 3797088、count 30783（首 `IgnoredProductList`） |

### 新增数据：`data/normalized/p0-field-rows.json`（5.5 MB）
- **170,271 行**，其中 **170,050** 行名字通过严格判据（99.9%），221 行未解析
- **15,236 个不同字段名**；游戏域抽检：`ProductId`、`ProductLicenseSOs`、`RequiredStoreLevel`、`BoxMarketPrice`、`CrateProductsData`、`NextProductID`
- 逐条来源：文件 + `sha256` + 字节数 + metadata 版本 + 字段表 offset/行宽/行数 + 名字判据 + 提取器
- **类归属仍显式 `classAttribution.status = not-attributed`**：82 字节类型记录内既无单调字段指针（v10/v13 实测），也无任何成员的求和等于字段数（v13 用正确的 170271 重测仍为空），所以不写"某字段属于某类"，只发布字段名本身

### 仍在求解
"类型→字段"映射。下一步候选：方法表（off 3797088）与字段表在同一区域的排布关系；以及类型记录尾部 u16 是否需要在正确的字段总数（170271）下重新解释。

## v15 负面结果（第 73 轮）：类型记录内没有字段指针
把"相邻差值=该类型字段数"这一判据套到每个 i32 成员上（这是**不依赖单调性**的判据）：

| 成员 | 值域 | 负差值个数 | 结论 |
| --- | --- | --- | --- |
| +8 | 24481..58588 | **7836 / 21151** | 差值样本 `24033, 1, 1, 1, 1, 1, -22715, 10868, 11494, -3`，无结构 → 不是字段起始 |
| +12 / +16 | -1..58585 | 2844 / 5601 | 大量 0 与 -1 → 计数/标志位，非起始 |
| +24 / +28 | 32 位极值 | 4620 / 4272 | 位域 |

结合此前结果：82 字节记录内**既无单调字段起始**（v10/v13）、**也无线性与字段总数相等**（v13 用正确的 170,271 重测）、**也无差值结构**（v15）。
因此 v39 的"类型→字段"引用不是在类型记录内以经典 `fieldStart/field_count` 存放的。继续需要：定位 Il2CppType 表（父类/字段类型解析）或反汇编 `GameAssembly.dll` 的元数据访问函数——本机无 dotnet、无 Il2CppDumper、AssetRipper 仅 GUI，这一条超出当前工具集。
**这不影响已发布的数据**：21,152 个类名 + 474 命名空间 + 15,236 个字段名都已按严格判据提取并带来源，缺的只是"哪个字段属于哪个类"。

## 发布前还差什么（三项一致）
1. **凭据**：GitHub 推送权限 / Cloudflare API token（`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`）。workflow 已就绪且受门禁约束，但没有凭据就不推、不建 Pages 项目。
2. **域名绑定**：三个域名的自定义域与 DNS 由账号所有者在面板完成（我故意没写进代码）。
3. 首次 CI 运行才是 workflow 语法的真正校验（本机无 YAML 解析器，只做了结构检查）。

## v16 受控负面结果（第 74 轮）：Il2CppType 表不以此形态存在
判据：枚举字节必须落在 1..0x21，且 CLASS(0x12)/VALUETYPE(0x11) 条目的索引必须落在已测类型表（21152）内——**抽样 120 条全部满足**才算命中。
扫描范围：头区间每个 (offset,value) 对 × 步长 8/12/16/20/24/28/32 × 两种语义（count / byteSize）× 行内每个 4 字节位置（16 字节步长时查 8..12）。

**真实文件结果：0 候选。**

**这一结果的可信度来自对照实验，而且我中途搞错过一次：**
- 第一版对照（v17）失败——我只植入了 2000 行，而头里声称 13680 行，扫描必然在 2000 行后越出植入区；**该对照判决作废**，当时我不该把它当成"扫描有缺陷"的证据。
- 重做的对照用 v16 **原脚本**跑植入文件（把头部声称的 13680 行全部植入：+0 放类索引、+10 放 0x12）：输出 `candidates: 1 / slot=44 off=3783408 raw=13680 stride=16 mode=count enumByte@+10 klassSeen=120`。
- 因此 v16 的扫描**具备发现此类表的能力**，"真实文件 0 候选"成立。

**推论**：本作 metadata v39 的 Il2CppType 表不是"固定步长 + 行内固定位置枚举字节"的形态（或索引含义不同）。结合 v10/v13/v15（类型记录内无字段指针），父类解析与字段归属这两条都需要**元数据结构之外的证据**：反汇编 GameAssembly.dll 的元数据访问函数，或用能识别 v39 的现成反编译工具。本机无 dotnet、无 Il2CppDumper、AssetRipper 仅 GUI——已超出当前工具集能闭合的范围，且**不通过猜测来填**。

已发布数据不受影响：21,152 类名（20,848 严格 + 304 原文）、474 命名空间、15,236 字段名（170,271 行）全部带来源与置信度；缺的 classAttribution 显式为 not-attributed。

## 影响
supermarket-simulator 的 P0 **从"无类型表"变为"有 21,152 个类的类名清单"**：类名/命名空间可逐条带来源与版本号写入 `p0-schema.json`（confidence: `verified-schema`），字段归属待解决后补齐。这不改变纪律：字段名未确证前不写字段级 P0，`unknown` 保持显式。
