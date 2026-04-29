# 公司服务器 Docker 发布说明

本文档对应当前项目的实际发布方式：

- 本地 Windows 机器负责构建 Docker 镜像
- Linux 公司服务器只负责 `docker load` 和运行容器
- 外网访问地址为 `http://223.107.76.50:9016/`
- 后端外网接口地址为 `http://223.107.76.50:9016/api/`
- 后端内网接口地址为 `http://10.10.10.17:8080/`

## 一、发布目标

最终访问关系如下：

- 前端页面：`http://223.107.76.50:9016/`
- 后端接口：`http://223.107.76.50:9016/api/`
- 前端容器实际运行地址：`http://10.10.10.17:3000`
- 前端容器内部访问后端：`http://10.10.10.17:8080`

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

## 三、上传镜像到 Linux 服务器

使用 FinalShell 将本地的 `energy-dashboard.tar` 上传到服务器目录：

```text
/opt/myapp/
```

## 四、服务器导入镜像

登录 Linux 服务器后执行：

```bash
cd /opt/myapp
sudo docker load -i energy-dashboard.tar
```

确认镜像存在：

```bash
sudo docker images | grep energy-dashboard
```

## 五、启动或更新前端容器

停止并删除旧容器：

```bash
sudo docker stop energy-dashboard 2>/dev/null
sudo docker rm energy-dashboard 2>/dev/null
```

使用正确的内网后端地址启动前端容器：

```bash
sudo docker run -d \
  --name energy-dashboard \
  -p 3000:3000 \
  -e API_BASE_URL=http://10.10.10.17:8080 \
  --restart unless-stopped \
  energy-dashboard:latest
```

确认前端容器运行正常：

```bash
sudo docker ps | grep energy-dashboard
sudo docker inspect energy-dashboard | grep API_BASE_URL
sudo docker logs --tail 100 energy-dashboard
```

## 六、Nginx 配置

服务器当前实际使用的 Nginx 配置文件为：

```text
/opt/myapp/frontend-test/nginx.conf
```

配置内容应为：

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
- `/api/proxy/` 必须优先代理到前端容器，因为当前前端项目内部会请求这个路径

## 七、重载 Nginx

当前服务器上的 Nginx 容器为：

```text
2bff3a122fdd
```

先检查配置：

```bash
sudo docker exec 2bff3a122fdd nginx -t
```

重载配置：

```bash
sudo docker exec 2bff3a122fdd nginx -s reload
```

如果 reload 失败，则直接重启 Nginx 容器：

```bash
sudo docker restart 2bff3a122fdd
```

## 八、部署验证

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

## 九、后续更新发布

每次前端代码更新后，重复执行以下流程。

### 本地 Windows

```powershell
cd E:\01_code\v0-energy-system-dashboard
docker build -t energy-dashboard:latest .
docker save -o energy-dashboard.tar energy-dashboard:latest
```

使用 FinalShell 上传新的 `energy-dashboard.tar` 到：

```text
/opt/myapp/
```

### Linux 服务器

```bash
cd /opt/myapp
sudo docker load -i energy-dashboard.tar

sudo docker stop energy-dashboard 2>/dev/null
sudo docker rm energy-dashboard 2>/dev/null

sudo docker run -d \
  --name energy-dashboard \
  -p 3000:3000 \
  -e API_BASE_URL=http://10.10.10.17:8080 \
  --restart unless-stopped \
  energy-dashboard:latest

sudo docker exec 2bff3a122fdd nginx -t
sudo docker exec 2bff3a122fdd nginx -s reload
```

## 十、常用排查命令

查看前端容器：

```bash
sudo docker ps | grep energy-dashboard
sudo docker logs --tail 100 energy-dashboard
```

查看前端环境变量：

```bash
sudo docker inspect energy-dashboard | grep API_BASE_URL
```

查看 Nginx 容器：

```bash
sudo docker ps
sudo docker exec 2bff3a122fdd nginx -t
```

查看本机端口监听：

```bash
ss -lntp | grep 3000
ss -lntp | grep 9016
```

本机测试页面：

```bash
wget -qO- http://127.0.0.1:3000 | head
wget -qO- http://127.0.0.1:9016 | head
```

## 十一、关键原则

- 浏览器访问的是外网地址 `http://223.107.76.50:9016/`
- 前端容器里的 `API_BASE_URL` 必须指向后端真实内网地址 `http://10.10.10.17:8080`
- 外网 Nginx 的 `/api/` 会代理到后端，但前端容器直连内网后端时不要再额外拼 `/api`
- 服务器不需要 Git，只需要 Docker 和现有 Nginx 容器
