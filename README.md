# OSS Sync Tool Server

## 项目简介
oss-sync-tool-server 是 oss-sync-tool 的后端服务，提供 API 接口供前端调用。

## 环境配置
在项目根目录下创建一个 `.env` 文件，配置以下环境变量：

```env
OSS_ACCESS_KEY_ID=OSS的KEY
OSS_ACCESS_KEY_SECRET=OSS的秘钥
PORT=监听端口，默认8965
WORKSPACE_BASE_DIR=工作区文件的存储路径，默认/tmp/workspace-files
DB_HOST=数据库地址，默认localhost
DB_PORT=数据库端口，默认3306
DB_USERNAME=数据库用户名，默认root
DB_PASSWORD=数据库密码，默认root
DB_DATABASE=数据库名，默认osstool
```

## 安装依赖

```bash
npm i
```

## 运行
```bash
npm run build
npm run start:prod
```

## Docker运行

```bash
# 构建镜像
docker build -t oss-sync-tool-server .
# 执行
docker-compose up -d # 参阅docker-compose.yml
```