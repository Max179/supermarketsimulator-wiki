# Supermarket Simulator — 数据边界报告（Windows 端）

**记录时间：** 2026-09-25 · **记录者：** Windows Harness（总负责人）

## 游戏包
| 项 | 值 |
|---|---|
| 安装路径 | `C:\uTorria\Downloads\Supermarket Simulator (2025)\Supermarket Simulator` |
| 可执行 | `Supermarket Simulator.exe` |
| 版本标签 | `Nokta Games | Supermarket Simulator`（`_Data/app.info`） |
| 引擎 | **Unity**（`UnityPlayer.dll` 34.1 MB） |
| 脚本后端 | **IL2CPP** — `GameAssembly.dll` 77.4 MB + `il2cpp_data\Metadata\global-metadata.dat` 18.45 MB |
| 数据根 | `Supermarket Simulator_Data` |

## 可读文件类型与体积
| 文件 | 体积 | 用途 |
|---|---|---|
| `resources.assets` | 384.7 MB | 资源与脚本对象 |
| `sharedassets2.assets` | 97.9 MB | 其它资源 |
| `level2` / `level3` | 27.2 / 26.3 MB | 场景 |
| `globalgamemanagers` | 8.5 MB | 全局管理器（含类型表） |
| `StreamingAssets\aa\catalog.bin` | 136 KB | **Addressables 资产地址目录** |
| `StreamingAssets\aa\StandaloneWindows64\localization-string-table-*.bundle` | 每份 ~25 MB | **本地化字符串表（商品名等）** |

## 数据边界结论
- **可读：** Addressables 目录与本地化 bundle；SerializedFile **对象表**（对象数、类 id、字节区间）。
- **当前不可读（工程阻塞，非用户阻塞）：** 玩法数值。Mono 版可用的「ECMA-335 字段布局」路径在本作不存在——IL2CPP 的字段布局在 `global-metadata.dat`（Il2CppGlobalMetadataHeader，与 ECMA-335 不同）。在补齐 IL2CPP 元数据读取器之前，**不允许凭猜测解释 MonoBehaviour 载荷**，宁缺勿造。
- **不入 Git：** 游戏包本体与 `Supermarket Simulator_Data`。
