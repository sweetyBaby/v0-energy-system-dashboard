# 公司服务器 Docker 发布说明

本文档对应当前项目在公司 Linux 服务器上的部署方式：

- 本地 Windows 机器负责构建 Docker 镜像
- Linux 服务器负责上传 `tar`、导入镜像、重启容器
- 支持两种发布方式：
  - 手动执行一条部署命令
  - 上传新的 `energy-dashboard.tar` 后自动部署
- 前端对外访问地址：`http://223.107.76.50:9016/`
- 后端对外接口地址：`http://223.107.76.50:9016/api/`
- 后端内网接口地址：`http://10.10.10.17:8080/`

## 一、发布目标

最终访问关系如下：

- 前端页面：`http://223.107.76.50:9016/`
- 后端接口：`http://223.107.76.50:9016/api/`
- 前端容器实际运行地址：`http://10.10.10.17:3000`
- 前端容器访问后端：`http://10.10.10.17:8080`

## 二、本地构建镜像

在本地 Windows PowerShell 中进入项目目录：

```powershell
cd E:\01_code\v0-energy-system-dashboard
```

构建镜像：

```powershell
docker build -t energy-dashboard:latest .
```

导出镜像文件：

```powershell
docker save -o energy-dashboard.tar energy-dashboard:latest
```

确认文件已生成：

```powershell
dir energy-dashboard.tar
```

## 三、上传文件到 Linux 服务器

使用 FinalShell 或 `scp` 上传以下文件到服务器目录：

```text
/ems/project/
```

推荐保留以下目录结构：

```text
/ems/project/
├─ energy-dashboard.tar
├─ deploy-company-server.sh
├─ install-company-auto-deploy.sh
└─ systemd/
   ├─ energy-dashboard-deploy.service
   └─ energy-dashboard-deploy.path
```

首次至少需要上传：

- `energy-dashboard.tar`
- `scripts/deploy-company-server.sh`
- `scripts/install-company-auto-deploy.sh`
- `scripts/systemd/energy-dashboard-deploy.service`
- `scripts/systemd/energy-dashboard-deploy.path`

说明：

- 上传到服务器时，建议把 `scripts/deploy-company-server.sh` 放到 `/ems/project/deploy-company-server.sh`
- 把 `scripts/install-company-auto-deploy.sh` 放到 `/ems/project/install-company-auto-deploy.sh`
- 把两个 systemd 文件放到 `/ems/project/systemd/`

## 四、首次配置部署脚本

首次登录 Linux 服务器后执行：

```bash
cd /ems/project
chmod +x deploy-company-server.sh
chmod +x install-company-auto-deploy.sh
mkdir -p systemd
```

建议再放一个部署配置文件，后面就不需要每次带参数：

```bash
cat > /ems/project/deploy-energy-dashboard.env <<'EOF'
PROJECT_DIR=/ems/project
IMAGE_TAR=energy-dashboard.tar
IMAGE_NAME=energy-dashboard:latest
CONTAINER_NAME=energy-dashboard
HOST_PORT=3000
CONTAINER_PORT=3000
API_BASE_URL=http://10.10.10.17:8080
NGINX_CONTAINER=2bff3a122fdd
WAIT_FOR_TAR_STABLE=1
TAR_STABLE_CHECK_INTERVAL=2
TAR_STABLE_CHECK_COUNT=2
EOF
```

说明：

- `NGINX_CONTAINER` 建议填 Nginx 容器名；如果没有容器名，再填容器 ID
- `WAIT_FOR_TAR_STABLE=1` 表示部署前先等待 tar 文件大小稳定，避免上传未完成时就开始部署
- 如果不配置 `NGINX_CONTAINER`，脚本会尝试自动识别正在运行的 Nginx 容器

## 五、手动发布方式

如果你只想保留“上传后手动执行一条命令”的方式，那么每次前端更新后只需要：

1. 本地重新构建并导出 `energy-dashboard.tar`
2. 上传新的 `energy-dashboard.tar` 到 `/ems/project/`
3. 在服务器执行：

```bash
cd /ems/project
bash deploy-company-server.sh
```

脚本会自动完成这些步骤：

- 导入镜像
- 停止旧容器
- 删除旧容器
- 启动新容器
- 检查 Nginx 配置
- reload Nginx
- 输出当前容器状态和最近日志

## 六、自动发布方式

如果你想做到“上传新的 `energy-dashboard.tar` 后自动部署”，推荐使用 `systemd path` 监听。

首次安装自动部署：

```bash
cd /ems/project
sudo bash install-company-auto-deploy.sh
```

安装脚本会自动完成：

- 把 `energy-dashboard-deploy.service` 安装到 `/etc/systemd/system/`
- 把 `energy-dashboard-deploy.path` 安装到 `/etc/systemd/system/`
- 执行 `systemctl daemon-reload`
- 启用并启动 `energy-dashboard-deploy.path`

安装完成后检查状态：

```bash
sudo systemctl status energy-dashboard-deploy.path
sudo systemctl status energy-dashboard-deploy.service
```

后续发布流程就变成：

1. 本地重新构建并导出 `energy-dashboard.tar`
2. 上传新的 `energy-dashboard.tar` 到 `/ems/project/`
3. 不需要再手动执行部署命令，服务器会自动触发部署

查看最近自动部署日志：

```bash
sudo journalctl -u energy-dashboard-deploy.service -n 100 --no-pager
```

实时观察自动部署日志：

```bash
sudo journalctl -u energy-dashboard-deploy.service -f
```

## 七、脚本支持的配置项

部署脚本文件：

```text
/ems/project/deploy-company-server.sh
```

自动部署安装脚本：

```text
/ems/project/install-company-auto-deploy.sh
```

systemd 文件：

```text
/ems/project/systemd/energy-dashboard-deploy.service
/ems/project/systemd/energy-dashboard-deploy.path
```

部署脚本支持以下环境变量：

```bash
PROJECT_DIR=/ems/project
CONFIG_FILE=/ems/project/deploy-energy-dashboard.env
IMAGE_TAR=energy-dashboard.tar
IMAGE_NAME=energy-dashboard:latest
CONTAINER_NAME=energy-dashboard
HOST_PORT=3000
CONTAINER_PORT=3000
API_BASE_URL=http://10.10.10.17:8080
NGINX_CONTAINER=2bff3a122fdd
NO_NGINX_RELOAD=0
DOCKER_BIN=docker
LOCK_FILE=/ems/project/deploy-energy-dashboard.lock
WAIT_FOR_TAR_STABLE=1
TAR_STABLE_CHECK_INTERVAL=2
TAR_STABLE_CHECK_COUNT=2
```

示例：

```bash
cd /ems/project
NGINX_CONTAINER=2bff3a122fdd bash deploy-company-server.sh
```

如果这次不想 reload Nginx：

```bash
cd /ems/project
NO_NGINX_RELOAD=1 bash deploy-company-server.sh
```

## 八、Nginx 配置参考

服务器当前实际使用的 Nginx 配置文件：

```text
/ems/project/frontend-test/nginx.conf
```

配置内容应类似：

```nginx
server {
    listen 80;
    server_name _;

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    location /api/proxy/ {
        proxy_pass http://10.10.10.17:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /api/ {
        proxy_pass http://java-back:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location / {
        proxy_pass http://10.10.10.17:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

说明：

- `/` 代理到前端页面
- `/api/` 代理到后端服务
- `/api/proxy/` 需要优先代理到前端容器

## 九、部署验证

验证前端容器本机访问：

```bash
wget -qO- http://127.0.0.1:3000 | head
```

验证 Nginx 代理后的本机访问：

```bash
wget -qO- http://127.0.0.1:9016 | head
wget -qO- http://127.0.0.1:9016/api/ | head
```

最终从浏览器访问：

```text
http://223.107.76.50:9016/
```

## 十、常用排查命令

查看前端容器：

```bash
sudo docker ps | grep energy-dashboard
```

查看容器环境变量：

```bash
sudo docker inspect energy-dashboard | grep API_BASE_URL
```

查看容器日志：

```bash
sudo docker logs --tail 100 energy-dashboard
```

手动触发一次部署：

```bash
cd /ems/project
bash deploy-company-server.sh
```

查看自动部署服务状态：

```bash
sudo systemctl status energy-dashboard-deploy.path
sudo systemctl status energy-dashboard-deploy.service
```

查看自动部署日志：

```bash
sudo journalctl -u energy-dashboard-deploy.service -n 100 --no-pager
```

检查 Nginx 配置：

```bash
sudo docker exec 2bff3a122fdd nginx -t
```

reload Nginx：

```bash
sudo docker exec 2bff3a122fdd nginx -s reload
```

如果 reload 失败，可直接重启 Nginx 容器：

```bash
sudo docker restart 2bff3a122fdd
```
