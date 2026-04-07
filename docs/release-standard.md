# 标准发布模板

本文档定义前端项目的标准发版规则，目标是让发布、回滚、排查都可重复执行。

## 一、镜像命名规范

统一镜像名：

```text
energy-dashboard
```

推荐每次构建同时打 3 类标签：

- `latest`
  用于当前默认发布
- 日期标签
  用于快速回滚，例如 `2026-04-07`
- 日期加流水标签
  用于同一天多次发布，例如 `2026-04-07.1`

推荐示例：

```powershell
docker build `
  -t energy-dashboard:latest `
  -t energy-dashboard:2026-04-07 `
  -t energy-dashboard:2026-04-07.1 `
  .
```

如果一天只发一次，可以只保留：

```powershell
docker build -t energy-dashboard:latest -t energy-dashboard:2026-04-07 .
```

## 二、发版日期标签规范

推荐规则如下：

- 单次发布：`YYYY-MM-DD`
- 同一天第 N 次发布：`YYYY-MM-DD.N`

示例：

- `2026-04-07`
- `2026-04-07.1`
- `2026-04-07.2`
- `2026-04-08`

不推荐的标签：

- `test`
- `new`
- `final`
- `v1`

原因：

- 含义不稳定
- 不利于排查
- 不利于回滚

## 三、服务器保留几个历史版本最合适

当前项目建议保留：

- `latest`
- 最近 3 个可回滚版本

也就是服务器上总共保留 4 个镜像标签最合适。

原因：

- 1 个当前版本用于在线运行
- 1 到 2 个版本应对最近发布异常
- 再多 1 个版本应对隔天或跨周回滚
- 再保留太多，对当前项目价值不高，只会增加管理成本

推荐保留示例：

```text
energy-dashboard:latest
energy-dashboard:2026-04-07.2
energy-dashboard:2026-04-07.1
energy-dashboard:2026-04-03
```

## 四、标准发版命令模板

### 本地 Windows 构建

```powershell
cd E:\01_code\v0-energy-system-dashboard

docker build `
  -t energy-dashboard:latest `
  -t energy-dashboard:2026-04-07 `
  -t energy-dashboard:2026-04-07.1 `
  .
```

导出当前发布版本镜像：

```powershell
docker save -o energy-dashboard-2026-04-07.1.tar energy-dashboard:2026-04-07.1
```

如果服务器只需要一个文件，也可以额外导出 `latest`：

```powershell
docker save -o energy-dashboard-latest.tar energy-dashboard:latest
```

### Linux 服务器导入

```bash
cd /opt/myapp
sudo docker load -i energy-dashboard-2026-04-07.1.tar
```

### Linux 服务器发布

```bash
sudo docker stop energy-dashboard 2>/dev/null
sudo docker rm energy-dashboard 2>/dev/null

sudo docker run -d \
  --name energy-dashboard \
  -p 3000:3000 \
  -e API_BASE_URL=http://10.10.10.17:8080 \
  --restart unless-stopped \
  energy-dashboard:2026-04-07.1

sudo docker exec 2bff3a122fdd nginx -t
sudo docker exec 2bff3a122fdd nginx -s reload
```

## 五、标准回滚命令模板

假设需要回滚到 `2026-04-07`：

```bash
sudo docker stop energy-dashboard
sudo docker rm energy-dashboard

sudo docker run -d \
  --name energy-dashboard \
  -p 3000:3000 \
  -e API_BASE_URL=http://10.10.10.17:8080 \
  --restart unless-stopped \
  energy-dashboard:2026-04-07

sudo docker exec 2bff3a122fdd nginx -t
sudo docker exec 2bff3a122fdd nginx -s reload
```

## 六、旧镜像清理建议

发布稳定后，可以删除过老版本，只保留最近 3 个历史版本。

先查看：

```bash
sudo docker images | grep energy-dashboard
```

再手动删除不需要的旧标签：

```bash
sudo docker rmi energy-dashboard:2026-03-20
```

不要删除当前正在运行的镜像标签。

## 七、执行原则

- 发布永远使用带日期的标签，不要只依赖 `latest`
- 回滚永远回到一个明确的历史标签
- 前端容器里的 `API_BASE_URL` 固定指向后端真实内网地址 `http://10.10.10.17:8080`
- 外网 `/api/` 由 Nginx 负责转发，不要把 `/api` 再写进前端容器的 `API_BASE_URL`
