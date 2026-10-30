# Local completion record - compact copy

The full round-by-round log (585 lines, 409024 bytes, 454 recorded rounds)
is the working record of the extraction host and stays there. This copy carries the standing state at the handoff commit plus the
most recent recorded rounds verbatim, so the Mac side has the facts without the history. Nothing here is generated at publish time.

## Standing state at the handoff commit
- Build: pages=242 indexable=203 noindex=39; documented version 1.6.0 (223).
- Documented identifiers: 21152 types and 170271 field rows; the rows themselves are carried by
  data/normalized/value-index.json (checksum and counts) and data/normalized/citation-index.json (the names they contribute).
- This package ships without git history: the tree counts in reports/status.json describe the extraction host tree, not the package.

## Most recent recorded rounds (verbatim, oldest first)
- 干净克隆复验（第 568 轮，本作，内容不增）：工区外 git clone（gc22-sm，HEAD 05d5ac7 / 555 次提交），13 步全部 exit 0——preflight 11/11、site pages=242 indexable=203、classify 203 keep / 31 noindex、verify entries=119 facts=940 unmatched=0、gate 119 词条 0 违规、coverage 21/21、imgcov 100 实图/19 注释（manifest 164）unusedRecords=0、imgsanity 164 条、tests 86 全过（# pass 1 / # fail 0）、tsc exit 0、smoke 通过、deploy-check 8 ready / 0 local failures / 2 external blockers。reports/handoff.md 的「Re-verified on」由第 564 轮更新为第 568 轮。
- 词条加深 ×1（第 569 轮，本作，词条 119、指南 77、页面、图片与 manifest 均不变；facts 940→**941**）：the-street-outside 再补一条——街上还有便携水箱、丙烷站及其气瓶架，并另有一块街牌（Ml_PortableWaterTank_01a、Ml_Propane_Station_01a、Ml_Propane_Tank_Holder_01a、Ml_Sign_06a）。四个名字按整名搜索确认此前无引用，token 检查 1006 个令牌 risky 0。整链复跑：site pages=242 indexable=203、classify 203/31、verify entries=119 facts=941 unmatched=0、gate 119 词条 0 违规、coverage 21/21、imgcov 100/19（manifest 164）、imgsanity 164 条、tests 86 全过、tsc exit 0。
- 阶段收尾（第 570 轮，本作，内容不增）：本轮对上阶段（400 轮预算）的状态做最后一次复核与记录。**最终状态**：HEAD 79b9472 / 556 次提交，工作树干净；119 条已发布词条（100 条带真图、19 条无图注释）、77 篇结构化指南、941 条事实、164 条已登记游戏图；`pages=242 indexable=203`（39 noindex）；coverage 21/21 栏、qualityFailures=0；tests 86 全过、tsc exit 0。**三件套**：preflight 11/11、smoke 通过、`deploy-check` **7 ready / 0 local failures / 3 external blockers**。**最近一次干净克隆复验**：第 568 轮（gc22-sm，HEAD 05d5ac7），13 步全 exit 0，克隆内 deploy-check 8 ready / 0 local / 2 external——即本站点可从已提交文件独立重建，无需游戏包。**发布腿（仍未完成，且不构成本地缺口）**：本机没有 GitHub remote、没有 `CLOUDFLARE_API_TOKEN`、没有 `CLOUDFLARE_ACCOUNT_ID`；`publish.yml` 与 Pages 配置都已就绪，一旦这三样到位即可执行 push → Actions → Pages → `node tools/smoke.mjs https://supermarketsimulator.wiki` 线上冒烟。按既定方针，这类外部凭据缺失只记为外部阻塞，不影响本地三站完成，也不把目标标记为完成或阻塞。
- 轻量交接包就绪（第 571 轮，本作，sm；工作树 clean，HEAD 为阶段收尾提交之后的交接提交）：新增 `pipeline/value_index.mjs`、`pipeline/citation_index.mjs`、`tools/mac-package.mjs` 三个脚本；原始解码层留在 Windows（p0-schema.json 3,251,751 B、p0-field-rows.json 5,461,188 B、20 个语言表 931,720 B，合计 9,644,659 B），由两个小型派生索引替代——`data/normalized/value-index.json`（1,233 B，sha256 722f29e6…，行数 170050 / 字段 170271 / sha256 361f8a8e…）与 `data/normalized/citation-index.json`（218,122 B，sha256 c01a244a…，仅解码层贡献的 15,162 个标识符，全集合 43,532 与 Windows 的 43,533 同源）。为此 `pipeline/status.mjs` 在缺行表时改记派生索引（带 derived:true），`tools/preflight.mjs` 据此校验计数；Windows 行为不变（真实文件在时仍指向真实文件，universe=43,533、valueLayer 指向 p0-field-rows.json），整链复跑 site pages=242 indexable=203、verify unmatched=0、gate 0 违规、coverage 21/21、tests 86 过、tsc exit 0。包体：536 文件 / 21,179,003 B，其中图片 258 个 / 16,217,627 B（游戏实图 164 个 / 16,035,526 B + 条目图 94 个 / 182,101 B），published 119 / 513,302 B、articles 77 / 217,348 B、源码 58 / 360,568 B、data 5 / 3,688,989 B；排除 10,778,776 B（解码层与语言表 9,644,659、redesign 截图 1,070,100、报告历史 62,588、HARNESS 便条 1,429），逐文件 bytes+sha256 见包内 `reports/mac-handoff-manifest.json`。实测：把包解到工作区外 scratch 目录、git init + commit 后跑 13 步全部 exit 0——preflight 11/11、site pages=242 indexable=203、classify 203/31、verify entries=119 facts=941 universe=43,532 unmatched=0、gate 119 条 0 违规、coverage 21/21、imgcov 164 记录 0 未用、imgsanity 164 条、status 记派生索引、tests 86 过、tsc exit 0、smoke 通过、deploy-check 7 ready / 0 local failures / 3 external（包内无 remote，多出「git remote」一项）。设计面不覆盖：`pipeline/site.mjs`（layout 第 104 行起、brand.svg 第 453 行、style.css 第 455 行）、`web/assets/*.svg` 均为 Mac efb7b6b 的设计整合范围，包内保留原件但交接书写明「取内容、不覆盖外壳」。
- 轻量包独立复验＋引用索引加固（第 572 轮，本作，sm）：针对「包内 verify 因 currentDiscount / discountRate / bulkDiscountRatio 等字段失败」的复现，确认根因是文章引用的字段只存在于被省略的解码层。反证（negative control）在包副本中实测：把 `data/normalized/citation-index.json` 移开后 `node tools/verify-citations.mjs` **exit=1 并列出 83 条 CHECK**（其中含 wholesale-offers-and-discounts 的三条折扣字段），放回后 **exit=0**（universe=43,532，unmatched=0）——即该派生索引是承重的，而不是恰好通过。索引本身按「保留来源/hash/version」改写为带出处的对象：`sources` 记 p0-schema.json（3,251,751 B，sha256 744523bf…）与 p0-field-rows.json（5,461,188 B，sha256 361f8a8e…），`version` 记 1.6.0 (223)，`count`=15,162、`universeCount`=43,532、`universeSha256`=40736dd3…；`tools/verify-citations.mjs` 同时接受新旧两种形状（数组或 `names`），Mac 轻量约束不变——完整 payload/raw/dist/报告历史仍不迁移（排除 10,778,776 B）。Windows 侧整链复跑仍 exit 0（site pages=242 indexable=203、verify universe=43,533 unmatched=0、gate 119 条 0 违规、coverage 21/21、tests 86 过、tsc exit 0）。打包后的分组字节：source 58/362,175、published 119/513,302、articles 77/217,348、images 258/16,217,627、data 5/3,765,660、content root 3/82,961、shell 9/5,106；总大小与逐文件 sha256 以包内 `reports/mac-handoff-manifest.json` 为准（该摘要与 handoff.md 本身也计入包内，故总数随这两份文件改写而变）。

The five entries above are the last recorded rounds. The complete list - every rejected picture, every gate run - lives in
reports/local-complete.md on the extraction host.


---

## Mac integration — 2026-10-30 (supermarket-dev)

The 2026-10-02 handoff package was integrated into the real repository
(`Max179/supermarketsimulator-wiki`) on macOS, on top of the Mac design commits (`e35ab15`, `dd15c32`,
`8984f06`, `efb7b6b`), and every gate was re-run from the committed tree with **no game files and no network**.
Full assessment: [`reports/revival-2026-10-30.md`](revival-2026-10-30.md); page-level checks:
[`reports/quality-audit-2026-10-30.md`](quality-audit-2026-10-30.md).

### What this Mac tree contains

- `node pipeline/site.mjs` builds **pages=242 indexable=203 noindex=39** from `content/` — 119 published entries
  (100 entity pages with a confirmed game picture + 19 picture-less noindex notes), 77 structured guides,
  164 mapped game images, 94 original diagrams — and `data/normalized/p0-inventory.json` (21,152 types,
  11,275 game / 9,877 engine; 170,271 field rows / 15,236 distinct names via `value-index.json`).
- Mac design ported **onto the package generator** (not overwriting it with the 20-page thin generator): hero with
  the verified in-game checkout picture, the interactive shift dashboard (tabs + checklist), the "what are you
  trying to do" task grid, the archive split with the featured restocking picture, the Mac colour tokens
  (`#101412` surface, `#d6f36b` accent), and the `metadata v39` source-version line. The Mac
  `web/assets/hero-checkout.png` / `featured-restocking.png` are byte-identical (sha256) to
  `content/assets/mapped/checkout-and-cashiers-selfcheckout.png` / `mapped/restocking-shelves-shelf.png`, so the
  port references the mapped record as the single provenance source instead of shipping duplicate bytes.
- `layout()` now emits JSON-LD (WebSite / WebPage / Article + BreadcrumbList), the complete Open Graph block, a
  Twitter card and `theme-color`; one new gate makes that durable (**87 gates** = the package's 86 + the Mac
  structured-data/social gate).
- The publish workflow's build step is now `node pipeline/site.mjs` (the Mac tree has no decoded schema, so
  `schema_to_inventory.mjs` is extraction-host only). Cloudflare Pages project `supermarketsimulator-wiki`, the
  `needs: gate` deploy job and the secret usage are unchanged.
- The stale Sep-28 Windows probes moved to `reports/archive-2026-09-28/`; the stale Sep-28 decoded layers
  (`p0-schema.json`, `p0-field-rows.json`) were removed from this tree (still in git history at `1d5735f`) and
  replaced by the Oct-2 derived `value-index.json` / `citation-index.json`.

### Exact commands and results (macOS, 2026-10-30)

```
node pipeline/site.mjs                        -> [site] pages=242 indexable=203 assets=261 mappedGameImages=164
                                                 gameClasses=11275 engineClasses=9877 out=web/dist          exit 0
node tests/site.test.mjs                      -> [site-tests] 87 passed, 0 failed                            exit 0
npx tsc --noEmit -p tsconfig.ci.json          -> (TypeScript 5.9.3, no output)                                exit 0
node tools/content-gate.mjs                   -> [content-gate] 119 entry file(s), 0 violation(s)             exit 0
node tools/verify-citations.mjs               -> entries=119 facts=941 distinctIdentifiers=1184
                                                 universe=43532 confirmedElsewhere=43 unmatched=0             exit 0
node tools/coverage.mjs                       -> columns=21 covered=21 published=119 draft=0 reference=0
                                                 absent=0 qualityFailures=0                                    exit 0
node tools/image-coverage.mjs                 -> entries=119 withGameImage=100 diagramOnly=19
                                                 manifestRecords=164 unusedRecords=0                           exit 0
node tools/classify-urls.mjs                  -> [classify] 203 keep, 31 noindex, 0 redirect(s)               exit 0
node tools/preflight.mjs                      -> [preflight] 11 ok, 0 failed                                  exit 0
node tools/smoke.mjs                          -> [smoke] 203 kept, 31 noindex, artefact in web/dist; pass    exit 0
node tools/deploy-check.mjs                   -> [deploy-check] 8 ready, 0 local failure(s), 2 external
                                                 blocker(s) (Cloudflare env vars absent on this Mac)          exit 0
git status --porcelain                        -> (empty after the final reports commit)                      exit 0
```

- HTML files emitted: 235 (203 indexable + 31 noindex + 404); `sitemap.xml` has exactly the 203 indexable URLs;
  `config/urls.json` classifies all 234 non-404 pages; internal links: 0 dangling; every image has alt text and
  exists; no page exceeds the 1 MiB weight budget; no two indexable pages share >90 % of their main content.
- `reports/status.json` was regenerated by `node pipeline/status.mjs` from this tree (not carried over from the
  package); it records the derived value layer (`value-index.json`, 170,050 rows, sha256 `361f8a8e…`).
- Git history kept: the five pre-existing commits (`1d5735f` import, `e35ab15` / `dd15c32` / `8984f06` /
  `efb7b6b` design) plus the Mac integration commits; `HARNESS-NEXT-ACTION.md` kept and refreshed.

### Remaining blockers (honest)

1. **Push + live deploy**: not performed from this Mac (the Lead owns push/deploy; GitHub Actions then builds the
   242-page artefact and `tools/smoke.mjs https://supermarketsimulator.wiki` is the post-publish check).
2. **Extraction-host-only steps** (`schema_to_inventory.mjs`, `value_index.mjs`, `citation_index.mjs`,
   `mac-package.mjs`, image/localization extractors) cannot run on a Mac clone: they need the decoded layers and
   the game package, which stay on the Windows host. The committed indexes are the build input.
3. **Type→field attribution** is still unmeasured for IL2CPP v39 (documented ceiling, not a writing gap); entries
   cite type/asset names and never claim a field belongs to a class.
4. **No game extraction exists for any newer build**: the site documents `1.6.0 (223)` only until a new package is
   extracted on the Windows host.

Integration commits (local, not pushed): `06fc38b` plan, `0b2b5fc` content/data, `df796c0` pipeline/tools/tests,
`49033b5` Mac design port, `79601b0` build/docs/workflow, `041ba7b` reports, `15c24fe` status. The clean-tree
gate chain above was run at `15c24fe`.


---

## Picture replacement — 2026-10-30 (sm-img, after the Mac integration)

The 164 raw Unity texture exports that the build shipped as entry pictures were replaced with 100 sourced in-game
pictures. Full record with data, commands and residual issues: [`reports/image-replacement-2026-10-30.md`](image-replacement-2026-10-30.md).

- `content/assets/mapped/`: 164 raw textures deleted, 100 normalised in-game pictures (jpg, 1200x750) added; 94
  original diagrams untouched. `content/images-manifest.json` replaced: 100 records, each with source site, source
  page, original URL, licence, rights review, retrieval date, verdict/reviewer and sha256/bytes/dimensions.
- Sources: 61 pictures from the Supermarket Simulator Wiki (Fandom) and 39 official Steam store screenshots; 48 unique
  pictures, 13 shared groups (max 7 entries). Home page hero/featured are `web/assets/hero-shop.jpg` /
  `web/assets/featured-card.jpg` (cropped official store screenshots; provenance in
  `reports/image-pack-2026-10-30.json`). The 19 diagram-only entries keep their diagrams and are unchanged.
- `/reference/sources.html` now generates a **Picture sources** table at build time from the manifest (file, entry,
  source site, source-page link, rights review, retrieved date); `/disclaimer` and README credit the store page and
  the community wikis and no longer claim the pictures were exported from a local game copy.
- The site gate suite grew from 87 to **88** gates: every record must name `sourceName`, `sourcePage`,
  `retrievedAt` and a rights review, every `sourcePage` must be an absolute http(s) URL, and every record must be
  listed on the sources page.
- Full chain re-run on this tree (all exit 0): image-sanity 100 records/0 flagged; image-coverage 100 used/0 unused;
  build `pages=242 indexable=203`; tests 88 passed/0 failed; tsc clean; content-gate 119/0; verify-citations
  unmatched=0; coverage 21/21 qualityFailures=0; classify 203 keep/31 noindex; preflight 11 ok/0 failed; smoke pass.
  `reports/status.json` regenerated from this tree.
- Known follow-up (reported to the Lead, not hidden): 46 entries still show a picture that is not their subject (the
  pack's Fandom match attached item renders such as book covers/coins/beer bottles, and 13 reused pictures are spread
  across categories); the 39 Steam records carry a third-party article as `sourcePage` while the files are official
  store screenshots. Both need a swap pack from the Lead; no provenance field was edited locally.

### Revision 2 — swap pack (same day)

The Lead's swap pack replaced the picture set again: 100 mapped pictures regenerated (67 byte-different), manifest
with 29 unique pictures (51 Fandom / 49 Steam), every Steam record's `sourcePage` now the official store page,
the FAQ-banner picture removed, no picture under 600 px selected, 42 of the 49 wrong-subject ids remapped, and the
sources-page home-page credit now links `https://store.steampowered.com/app/2670630/`. Ledger, sanity, coverage,
status and the replacement record refreshed; chain re-run on the committed tree: `pages=242 indexable=203`, 88/88
tests, tsc, content-gate, citations, coverage, classify, image-sanity, image-coverage, preflight and smoke all exit 0.
Residual: 12 pictures still clearly off-subject and reuse is 29 unique pictures with a 14-entry shared group — both
listed in [`reports/image-replacement-2026-10-30.md`](image-replacement-2026-10-30.md) for the Lead.

### Revision 3 — wiki completeness pass (same day)

The Lead's completeness patch (`reports/image-pack-2026-10-30-completeness.json`) swapped 16 of the remaining
weak/wrong pictures and promoted 8 diagram-only subjects to pictured entries: `asking-a-helper-to-fetch-something`,
`hiring-a-cashier`, `jobs-you-can-hand-over`, `setting-prices-in-bulk`,
`the-day-results-screen-and-what-it-counts`, `the-pricing-screen-and-how-a-price-is-chosen`,
`the-window-the-money-tabs-live-in`, `what-the-game-keeps-about-an-employee`. The build stayed at **242 pages** and
moved to **211 indexable** (the 8 note pages became entry pages); 108 pictured entries, 11 diagram-only notes and 94
diagrams remain; the manifest now has 108 records (51 Fandom / 57 Steam, 27 unique pictures). Two pack bookkeeping
defects were recorded rather than hidden: the 24 patch records lack `originalUrl`, and five `sourcePage` values were
percent-encoded (literal spaces) on integration. Ledger, image-sources, sanity, coverage, URL classification, status
and the replacement record refreshed; chain re-run: `pages=242 indexable=211`, 88/88 tests, tsc, content-gate,
citations, coverage, classify, image-sanity, image-coverage, preflight and smoke all exit 0. Residual: four vehicle
entries still show the shop-front screenshot and eight pictures are generic rather than subject-specific — both
listed in [`reports/image-replacement-2026-10-30.md`](image-replacement-2026-10-30.md).
