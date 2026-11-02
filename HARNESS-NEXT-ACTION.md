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

下一步（需 Lead 明确指令）：
- push → Actions gate/deploy → `node tools/smoke.mjs https://supermarketsimulator.wiki`。
- 线上通过后手动 `npm run indexnow -- --dry-run` / `npm run indexnow`（不在 CI）。
- 禁止大改模板 / 重跑 IL2CPP；禁止碰 thegraveyardkeeper / PREVIEW_NOINDEX。tcg-shop sitemap 已正确，勿移植。
