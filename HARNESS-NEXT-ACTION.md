P0 — sitemap 畸形：**已闭环**（2026-11-02 ~21:02 Asia/Shanghai）

现网 https://supermarketsimulator.wiki/sitemap.xml = 211×`<url><loc>clean</loc></url>`，无裸 loc、无 `.html`。
证据：commit `d490774` + Actions `41449306399`（gate✓ deploy✓）。本地 `node pipeline/site.mjs` + `smoke` 绿。

**今晚不要再改 sitemap 生成器。** tcgshopdb 现网同样已正确，勿移植。

P1 — 顾客词簇：**本地完成**（2026-11-03，未 push）

- 新增可索引指南 `/articles/keeping-the-route-from-the-door-to-the-till-clear`（8 步，全部用既有已发布事实作依据）。
- 内链：新指南 → 3 个 entry + 2 篇 guide；`laying-out-a-shop-you-can-work-in`、`signing-the-shop-so-customers-find-things`、`keeping-the-tills-moving-as-the-shop-grows` → 新指南。`/articles/`、`/updates`、首页自动收录。
- noindex 升级 **0 个**：11 个 note 全部是 diagram-only、无确认游戏内图；站点规则与 README 明确此类不索引。没有新图包，且未重跑 IL2CPP，故 0～3 的额度用 0；若日后有图包，优先 `running-a-shop-with-other-players`、`the-kinds-of-missions-the-game-builds`、`writing-a-name-that-fits`（多人三篇互相重叠，不要一起索引）。
- 门禁：build 243/212、tests 95/0、tsc 0、content-gate 119/0、citations unmatched=0、coverage 21/21、image-coverage 108/11、classify 212/23、preflight 11/11、smoke pass。`reports/status.json` 已重生成。
- 记录：`reports/growth-2026-11-03.md`、`reports/seo-audit.md`（2026-11-03 addendum）。

P1b — 利润词簇：**本地完成**（2026-11-04，未 push）

- 新增可索引指南 `/articles/what-a-days-profit-is-actually-made-of`（10 步，覆盖市场成本 / 标价 / 毛利计算 / 折扣 / 批发报价 / 动态价 / 日结记录 / 经常性开支与自动账单 / 借款）。
- 内链：新指南 → 5 个 entry + 3 篇 guide；`/`（Latest updates）、`/articles/repricing-the-shop-in-one-pass`、`/articles/turning-a-days-results-into-the-next-days-plan` → 新指南；`/articles/` 与 `/updates` 自动收录。共 3 条可见入站内链，未改模板区块。
- noindex 升级 **0 个**：11 个 note 仍全部是 diagram-only，108 条图片记录全部在用、无未用图，无新图包且未重跑 IL2CPP；0～2 的额度用 0。
- 门禁：build 244/213、tests 95/0、tsc 0、content-gate 119/0、citations unmatched=0、coverage 21/21、image-coverage 108/11、classify 213/23、preflight 11/11、smoke pass。`reports/status.json` 已重生成。
- 记录：`reports/growth-2026-11-04.md`。

P1c — 进货补货 / 进货定价词簇：**本地完成**（2026-11-05，未 push）

- 新增可索引指南 `/articles/reordering-by-what-is-on-the-shelf`（12 步，覆盖货架与在途数量 / 货道 / 架上箱 / 订货本 / 数量控件 / 市场成本 vs 标价 / 毛利 / 批量与批发报价 / 后仓合并与分区 / 箱子落位 / 补货节奏 / 商品所需店铺等级）。
- 内链：新指南 → 8 个 entry + 4 篇 guide；`/`（Latest updates）、`/articles/restocking-routine`、`/articles/buying-stock-without-being-taken-in` → 新指南；`/articles/` 与 `/updates` 自动收录。共 3 条可见入站内链，未改模板区块。
- noindex 升级 **0 个**：11 个 note 仍全部是 diagram-only，108 条图片记录全部在用、无未用图，无新图包且未重跑 IL2CPP；0～2 的额度用 0。最厚的 note（15 facts / 423 words）也受图片政策约束，不凑数。
- 门禁：build 245/214、tests 95/0、tsc 0、content-gate 119/0、citations unmatched=0、coverage 21/21、image-coverage 108/11、classify 214/23、preflight 11/11、smoke pass。`reports/status.json` 已重生成。
- 记录：`reports/growth-2026-11-05.md`。

P1d — 进货定价连接路径（新品牌首次定价）：**本地完成**（2026-11-05，未 push）

- 新增可索引指南 `/articles/pricing-a-new-product-before-the-first-sale`（10 步，覆盖购买清单 / 商品所需店铺等级 / 当日市场成本 / 定价画布 / 毛利 / 快速定价 / 动态价 / 批发报价与折扣 / 货道或展示槽 / 日结记录）。定位是「购买/报价」与「利润/补货」之间的连接路径：首次定价，不是顾客路线、日结利润、一键改价或按货架补货数量。
- 内链：新指南 → 8 个 entry + 5 篇 guide；`/`（Latest updates）、`/articles/buying-stock-without-being-taken-in`、`/articles/what-a-days-profit-is-actually-made-of` → 新指南；`/articles/` 与 `/updates` 自动收录。共 3 条可见入站内链，未改模板区块。
- noindex 升级 **0 个**：11 个 note 仍全部是 diagram-only，108 条图片记录全部在用、无未用图，无新图包且未重跑 IL2CPP；0～2 的额度用 0。最厚的三篇（15/375、10/364、9/362 facts/body words）也受图片政策约束，不凑数。
- 门禁：build 246/215、tests 95/0、tsc 0、content-gate 119/0、citations unmatched=0、coverage 21/21、image-coverage 108/11、classify 215/23、preflight 11/11、smoke pass。`reports/status.json` 已重生成。
- 记录：`reports/growth-2026-11-05.md`（Pass 2）。

下一步（需 Lead 明确指令）：
- push → Actions gate/deploy → `node tools/smoke.mjs https://supermarketsimulator.wiki`。
- 线上通过后手动 `npm run indexnow -- --dry-run` / `npm run indexnow`（不在 CI）。
- 禁止大改模板 / 重跑 IL2CPP；禁止碰 thegraveyardkeeper / PREVIEW_NOINDEX。tcg-shop sitemap 已正确，勿移植。
