# MLink

MLink 是一个 VS Code 扩展，用于在 Markdown 工作区中查看当前文档的出链和反向链接。

![](img/image.png)

## 功能

- 双向链接分析：展示当前文档引用的本地链接，以及引用当前文档的 Markdown 文件。
- 智能路径解析：支持标准 Markdown 链接 `[text](path)`，兼容工作区绝对路径和相对路径。
- 自动补全：链接缺少 `.md` 扩展名时，会尝试匹配同名 Markdown 文件。
- 文件与目录识别：目录链接会显示目录图标，点击后在 VS Code Explorer 中定位。
- 内存索引：扫描结果保存在内存中，并通过文件监听保持更新。
- 上下文感知：仅在当前编辑器为 Markdown 文件时展示侧边栏视图和相关内容。
- 英文界面：插件在 VS Code 中展示的标题、命令和提示统一使用英文。

## 项目结构

- `src/extension.ts`：扩展激活入口，只负责装配视图、命令和文件监听。
- `src/markdownIndex.ts`：Markdown 链接索引核心，不依赖 VS Code，便于单元测试。
- `src/treeProvider.ts`：侧边栏树视图数据提供者。
- `src/commands.ts`：命令注册和跳转逻辑。
- `src/watchers.ts`：Markdown 文件监听逻辑。
- `src/type.ts`：树节点和链接元数据类型。

## 开发命令

- `npm run check-types`：执行 TypeScript 类型检查。
- `npm run lint`：执行 ESLint 检查。
- `npm run unit-test`：运行链接索引单元测试。
- `npm run compile`：执行类型检查、代码检查并打包扩展。

## 说明

当前索引只处理标准 Markdown 行内链接，不处理 Wiki 链接或引用式链接。建议后续将链接解析逻辑独立为解析器模块，便于支持更多 Markdown 语法。
