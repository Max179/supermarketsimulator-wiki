P0 — 修 sitemap 畸形（2026-11-02 小黑）

现网 sitemap 是裸 <loc> + .html。先修生成器：每条必须 <url><loc>https://supermarketsimulator.wiki/…</loc></url>，loc 用无 .html 的 clean URL。

然后：1 篇可索引长尾（进货定价/顾客/利润三选一）+ 2～3 条内链；仅把已够厚的 0～3 页改 indexable。

门禁绿 → 更新 reports/status.json。默认本地 commit，不 push。修完把同一补丁移植到 ../tcg-shop。禁止大改模板 / 重跑 IL2CPP。

完整 Prompt：见 box /workspace/site-growth/seo/dsh/2026-11-02-continue-inject.md Prompt C
