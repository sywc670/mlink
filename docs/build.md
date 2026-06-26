# 1. 安装依赖
npm install

# 2. 跑测试/检查，建议上传前做
npm run check-types
npm run lint
npm run unit-test

# 3. 构建生产包
npm run package

# 4. 生成 .vsix
npx @vscode/vsce package