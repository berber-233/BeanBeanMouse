# Codex「Duplicate namespace name」会话死锁：排查与修复

> 记录时间：2026-09-11
> 触发环境：Codex Desktop `26.903.71938` / Codex CLI `0.153.4`（wire_api = responses）
> 关联报告：`codex-bug-report-duplicate-namespace-mcp-node-repl.md`（**仓库外部**文件，
> 位于用户 Codex 输出目录，未纳入本仓库；此处记录其文件名以便追溯）

## 一、现象

同一回合内调用两次 `tool_search` 后，请求被服务端拒绝：

```
Duplicate namespace name 'mcp__node_repl' in input[22].tools[0].
Namespace names must be unique.
```

更严重的是：**这条错误会被写进会话历史（rollout）**。之后该会话的每一轮都会带着
重复声明重新发请求，于是每轮都失败——表现为"这个会话彻底哑了，换新会话才正常"。

复现记录中，一次会话连续 6 轮全部失败；另一次与 App 自带命名空间 `codex_app` 冲突。

## 二、根因

`tool_search` 的返回值（`tool_search_output.tools`）会被当成"命名空间声明"，
在后续每次请求里随历史一起回放。问题出在**同一回合内第二次 `tool_search` 时**：

1. 第一次搜索已声明了 `mcp__node_repl`、`mcp__cloudflare_docs` 等；
2. 第二次搜索即使换了关键词，返回的仍是同一批已声明过的命名空间；
3. 内核没有做"去重 / 只发增量"，把整批命名空间又追加了一遍；
4. 请求体里同一个 namespace 出现两次 → 服务端 400 拒绝；
5. 错误事件落入 rollout → 历史被污染 → 之后每轮必然重放同样的重复声明。

因此这是**内核（core）侧缺陷**，不是配置问题，也不是某个 MCP server 的问题。
已确认**没有用户侧开关可以关闭该机制**：

```
codex features list
  tool_search                      removed (false)
  tool_search_always_defer_mcp_tools  removed (true)
  js_repl                          removed
```

本项目侧能做的只有三件事：**规避（不再触发）→ 修复（清理受损会话）→ 反馈上游**。

## 三、规避：单回合最多一次 `tool_search`

已写入全局规则 `~/.codex/AGENTS.md`：

- 一个回合内最多调用一次 `tool_search`，绝不在同一回合发起第二次；
- 第一次返回的命名空间直接复用，不要"换个关键词再找一次"；
- 确实还需要检索时，等下一个用户回合再发起。

## 四、修复受损会话：`scripts/fix-duplicate-namespaces.mjs`

内核修不了，但**被污染的数据可以修**：把 rollout 里重复的命名空间声明去掉，
会话即可恢复正常续聊。脚本为零依赖 Node ESM。

### 它做什么

1. 扫描 `$CODEX_HOME/sessions` 与 `$CODEX_HOME/archived_sessions` 下所有
   `rollout-*.jsonl`（也可显式传文件路径）；
2. 按文件顺序维护"已声明命名空间"集合（默认把 `codex_app` 视为 App 自带，
   可用 `--builtin=a,b` 追加）；
3. 对每个 `tool_search_output` 剥掉重复命名空间；若剥完为空，则连同它的
   `tool_search_call` 一起删除（避免留下没有输出的孤立工具调用）；
4. 默认**干跑**（只报告）；加 `--apply` 才写回，并自动生成
   `rollout-*.jsonl.bak-<ISO时间>` 备份。

### 用法

```bash
# 干跑：只报告哪些文件需要修
node scripts/fix-duplicate-namespaces.mjs

# 修复：写回 + 自动备份
node scripts/fix-duplicate-namespaces.mjs --apply

# 只处理指定文件
node scripts/fix-duplicate-namespaces.mjs --apply "C:/Users/<你>/.codex/archived_sessions/rollout-xxx.jsonl"

# 额外把已内置的命名空间也算进去
node scripts/fix-duplicate-namespaces.mjs --builtin=codex_app,my_builtin
```

### 关于历史库投影偏移

改写 rollout 会改变文件字节长度，而 `~/.codex/thread_history_1.sqlite` 的
`thread_history_projection_state.next_rollout_byte_offset` 记录的是"已消费到哪个字节"。
字节长度变了就需要对齐，否则增量投影会错位：

```bash
node scripts/fix-duplicate-namespaces.mjs --sync-projection --apply <修复过的文件...>
```

脚本只对齐 `next_rollout_byte_offset`，**不回退 `next_rollout_ordinal`**
（ordinal 是稳定的已消费序号，回退会重复投影）。

`thread_items` 只缓存高层条目（agentMessage / fileChange / reasoning /
commandExecution / webSearch / userMessage / mcpToolCall / contextCompaction），
**不含 `tool_search_output`**，所以修 rollout 就够了，不需要动 `thread_items`。

## 五、本次实际处理结果（2026-09-11）

| 文件 | 问题 | 处理 | 大小变化 |
| --- | --- | --- | --- |
| `archived_sessions/rollout-2026-09-11T14-37-12-01a08f2f-….jsonl` | 两组 tool_search 返回同一批 `mcp__node_repl` + `mcp__cloudflare_docs` | 删除重复的 1 组 `tool_search_call` + `tool_search_output` | 250500 → 247360 字节 |
| `archived_sessions/rollout-2026-08-10T23-34-02-019fec4f-….jsonl` | 与内置 `codex_app` 重复声明 | 重写该行，剥掉重复命名空间 | 15891574 → 15883889 字节 |

- 两个文件均已生成 `.bak-2026-09-11T07-17-06-*` 备份，可随时回滚；
- 投影偏移已同步；
- 复扫结果：`scanned 47 rollout file(s), 0 need repair`；
- 两个文件 JSON.parse 全通过。

### 回滚方式

把 `.bak-*` 覆盖回原文件（并重新跑一次 `--sync-projection --apply`）即可。

## 六、验证与残余风险

- **数据层已验证**：复扫 0 待修、JSON 全部可解析。
- **实机验证待做**：把被修的两个会话取消归档后继续对话，确认不再报
  `Duplicate namespace name`。
- **残余风险**：`thread_turns.error_json` 里仍留有历史报错记录（1 条 + 6 条）。
  它们只是历史错误留痕，不影响 rollout 回放，暂未清理，以免干扰 UI 展示。
- **上游未修**：只要内核仍会在单回合第二次 `tool_search` 时重复声明，
  新会话仍可能再次踩坑——所以 `~/.codex/AGENTS.md` 的规避规则要一直保留；
  升级 Codex 后可复跑一次本脚本自查。

## 七、给上游的最小复现要点

1. 配好至少 2 个远程 MCP + 1 个本地 MCP（如 `node_repl`）；
2. 让模型在同一回合调用两次 `tool_search`（第二次换关键词、结果集相同）；
3. 观察 request 的 `input[*].tools` 中出现重复 namespace，服务端 400；
4. 之后该会话每轮必失败（错误已进历史）。

期望修复方向：内核在拼接 `tool_search_output` 时按 namespace 名去重，
或只发增量命名空间；同时错误不应污染会话历史。
