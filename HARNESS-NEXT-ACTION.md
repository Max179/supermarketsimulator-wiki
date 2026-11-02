P0 — sitemap 畸形：**已闭环**（2026-11-02 ~21:02 Asia/Shanghai）

现网 https://supermarketsimulator.wiki/sitemap.xml = 211×`<url><loc>clean</loc></url>`，无裸 loc、无 `.html`。
证据：commit `d490774` + Actions `41449306399`（gate✓ deploy✓）。本地 `node pipeline/site.mjs` + `smoke` 绿。

**今晚不要再改 sitemap 生成器。** tcgshopdb 现网同样已正确，勿移植。

P1（下一刀）：
- 选 1 词簇（进货定价/顾客/利润三选一）新增 1 篇可索引指南 + 2～3 条内链
- 仅把「已够厚」的 0～3 个 noindex 页改为 indexable
- 门禁绿 → 更新 reports/status.json；默认本地 commit，不 push（除非 Lead 明确）
- 禁止大改模板 / 重跑 IL2CPP；禁止碰 GK 索引

完整 Prompt：seo-dsh/2026-11-02-continue-inject.md Prompt C（P0 已绿）
