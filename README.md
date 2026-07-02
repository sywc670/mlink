# MLink

[English](README.en.md)

MLink 是一个 VS Code 扩展，用来在 Markdown 工作区中查看当前文件的链接和反向链接。

![](img/image.png)

## 功能

- 在侧边栏显示当前 Markdown 文件的出链和反向链接。
- 标题锚点出链会在侧边栏中按 `path#heading` 单独显示。
- 支持相对路径、工作区绝对路径和省略 `.md` 后缀的本地链接。
- 点击正向链接项会打开链接目标，目录链接会在资源管理器中定位。
- 右键正向链接项可定位到当前文件中的链接行。
- 点击反向链接项会打开包含反向链接的文件并定位到对应行。
- 通过 `#heading` 引用标题时，高亮被引用标题行开头的 `#`。
- 自动索引工作区 Markdown 文件，并在文件变化后更新。
- 提供 `MLink: Refresh Workspace Index` 命令手动刷新索引。

## 使用

1. 打开包含 Markdown 文件的 VS Code 工作区。
2. 打开任意 Markdown 文件。
3. 在 Activity Bar 中打开 MLink，查看 `Links` 和 `Backlinks`。

## 开发

```bash
npm install
npm run compile
npm run unit-test
```

常用命令：

- `npm run check-types`：类型检查。
- `npm run lint`：代码检查。
- `npm run unit-test`：运行单元测试。
- `npm run compile`：检查并打包扩展。

源码目录：

- `src/extension.ts`：扩展入口和模块装配。
- `src/commands`：命令注册、参数解析和链接导航。
- `src/features`：面向编辑器或视图的功能模块。
- `src/services`：索引、解析等可复用业务服务。
- `src/shared`：共享类型和轻量工具。
- `src/test`：单元测试。

## 限制

MLink 目前只解析标准 Markdown 行内链接，例如 `[text](path)`。暂不支持 Wiki 链接和引用式链接。
