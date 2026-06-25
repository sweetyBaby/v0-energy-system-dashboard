# Next.js Chunk 缓存与白屏兜底操作文档

本文档用于处理生产环境偶发的：

```text
Application error: a client-side exception has occurred
ChunkLoadError: Failed to load chunk /_next/static/chunks/*.js
net::ERR_CACHE_READ_FAILURE
```

该问题通常不是后端接口异常，而是浏览器加载 Next.js 静态 JS 分包失败。常见场景是前端容器更新后，旧页面仍引用旧构建的 chunk 文件；或者浏览器本地缓存读取失败。

## 一、目标

- 让 Nginx 缓存 `/_next/static/` 下的 Next.js hashed 静态资源。
- 前端容器更新后，旧页面仍能从 Nginx 缓存读到旧 chunk，避免白屏。
- 页面 HTML 不长期缓存，避免旧 HTML 长时间引用过期 chunk。
- 前端增加一次性兜底刷新，处理极少数浏览器缓存损坏场景。

## 二、涉及文件

本地文件：

```text
C:\Users\juan.Zheng\Desktop\fsdownload\docker-compose.yml
C:\Users\juan.Zheng\Desktop\fsdownload\nginx-admin.conf
E:\01_code\v0-energy-system-dashboard\app\layout.tsx
```

服务器文件通常对应：

```text
/home/bms/base_docker/docker-compose.yml
/home/bms/base_docker/data/nginx/conf/conf.d/nginx-admin.conf
```

实际服务器目录以当前部署环境为准。

## 三、配置要求

### 1. docker-compose.yml

Nginx 服务的 `volumes` 中需要包含：

```yaml
- ./data/nginx/cache:/var/cache/nginx
```

示例：

```yaml
nginx:
  image: nginx:stable-alpine
  container_name: nginx
  restart: unless-stopped
  volumes:
    - ./data/nginx/conf/nginx.conf:/etc/nginx/nginx.conf:ro
    - ./data/nginx/conf/conf.d:/etc/nginx/conf.d:ro
    - ./data/nginx/html:/usr/share/nginx/html:ro
    - ./data/nginx/log:/var/log/nginx
    - ./data/nginx/cache:/var/cache/nginx
```

### 2. nginx-admin.conf

文件顶部增加缓存区定义：

```nginx
proxy_cache_path /var/cache/nginx/next-static levels=1:2 keys_zone=next_static_cache:100m max_size=2g inactive=7d use_temp_path=off;
```

在 `server { ... }` 内，并且放在通用静态资源规则之前，增加：

```nginx
location ^~ /_next/static/ {
    proxy_pass http://energy-dashboard:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_cache next_static_cache;
    proxy_cache_valid 200 301 302 7d;
    proxy_cache_lock on;
    proxy_cache_background_update on;
    proxy_cache_use_stale error timeout invalid_header updating http_500 http_502 http_503 http_504;

    expires 1y;
    proxy_hide_header Cache-Control;
    add_header Cache-Control "public, max-age=31536000, immutable" always;
    add_header X-Next-Static-Cache $upstream_cache_status always;
}
```

页面入口 `location /` 内需要禁止 HTML 长期缓存：

```nginx
expires -1;
add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate" always;
add_header Pragma "no-cache" always;
```

## 四、Linux 服务器操作步骤

### 1. 上传配置文件

将本地更新后的文件上传并覆盖服务器文件：

```text
docker-compose.yml
nginx-admin.conf
```

常见目标路径：

```text
/home/bms/base_docker/docker-compose.yml
/home/bms/base_docker/data/nginx/conf/conf.d/nginx-admin.conf
```

### 2. 进入部署目录

```bash
cd /home/bms/base_docker
```

### 3. 创建 Nginx 缓存目录

普通用户可能没有权限，需要使用 `sudo`：

```bash
sudo mkdir -p ./data/nginx/cache
sudo chmod -R 755 ./data/nginx/cache
```

确认目录存在：

```bash
ls -ld ./data/nginx/cache
```

应看到类似：

```text
drwxr-xr-x ...
```

### 4. 检查配置是否写入

```bash
grep -n "proxy_cache_path" ./data/nginx/conf/conf.d/nginx-admin.conf
grep -n "location \^~ /_next/static" ./data/nginx/conf/conf.d/nginx-admin.conf
grep -n "proxy_cache next_static_cache" ./data/nginx/conf/conf.d/nginx-admin.conf
grep -n "/var/cache/nginx" ./docker-compose.yml
```

四条命令都应有输出。

### 5. 重建 Nginx 容器

因为新增了 volume 挂载，只执行 `nginx -s reload` 不够，必须重建 Nginx 容器。

优先使用：

```bash
sudo docker compose up -d --force-recreate nginx
```

如果服务器使用老版本 compose：

```bash
sudo docker-compose up -d --force-recreate nginx
```

### 6. 检查 Nginx 配置语法

```bash
sudo docker exec nginx nginx -t
```

必须看到：

```text
syntax is ok
test is successful
```

### 7. 重载 Nginx

```bash
sudo docker exec nginx nginx -s reload
```

## 五、验证步骤

### 1. 验证首页 HTML 不缓存

```bash
curl -I http://127.0.0.1:9016/
```

应看到类似：

```text
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
```

### 2. 查找一个真实 chunk 路径

```bash
curl -s http://127.0.0.1:9016/ | grep -o '/_next/static/chunks/[^"]*\.js' | head -n 1
```

如果输出类似：

```text
/_next/static/chunks/xxxxx.js
```

继续执行下一步。

如果没有输出，可以在浏览器 DevTools 的 Network 面板中复制任意一个 `/_next/static/chunks/*.js` 请求路径。

### 3. 验证 Nginx 静态缓存

将下面命令里的路径替换为真实 chunk 路径：

```bash
curl -I "http://127.0.0.1:9016/_next/static/chunks/xxxxx.js"
curl -I "http://127.0.0.1:9016/_next/static/chunks/xxxxx.js"
```

第一次可能看到：

```text
X-Next-Static-Cache: MISS
```

第二次理想情况下应看到：

```text
X-Next-Static-Cache: HIT
```

并且应看到：

```text
Cache-Control: public, max-age=31536000, immutable
```

## 六、前端兜底脚本说明

项目中的 `app/layout.tsx` 增加了早期执行的 chunk 失败恢复脚本。

它只处理以下类型错误：

- `ChunkLoadError`
- `Loading chunk failed`
- `Failed to fetch dynamically imported module`
- `/_next/static/chunks`
- `ERR_CACHE_READ_FAILURE`

命中后会刷新页面一次，并通过 `sessionStorage` 限制 30 秒内最多刷新一次，避免无限刷新。

注意：这是保险层。真正避免用户看到闪屏的关键仍然是 Nginx 保留旧 chunk 缓存。

## 七、如果修改了 app/layout.tsx

`app/layout.tsx` 是前端代码，修改后需要重新构建并部署前端镜像。

如果在服务器上直接构建：

```bash
docker build -t energy-dashboard:latest .
sudo docker compose up -d --force-recreate energy-dashboard
sudo docker exec nginx nginx -s reload
```

如果沿用本地构建、上传 `energy-dashboard.tar` 的流程，则按现有发布流程重新导入镜像并重建 `energy-dashboard` 容器。

## 八、常见问题

### 1. 只加这两行可以吗？

不可以。

这两行只定义和挂载缓存目录：

```nginx
proxy_cache_path /var/cache/nginx/next-static levels=1:2 keys_zone=next_static_cache:100m max_size=2g inactive=7d use_temp_path=off;
```

```yaml
- ./data/nginx/cache:/var/cache/nginx
```

还必须在 `location ^~ /_next/static/` 中使用：

```nginx
proxy_cache next_static_cache;
```

否则 Nginx 不会实际缓存 Next chunk。

### 2. mkdir 提示 Permission denied 怎么办？

使用 `sudo`：

```bash
sudo mkdir -p ./data/nginx/cache
sudo chmod -R 755 ./data/nginx/cache
```

### 3. 为什么必须重建 Nginx 容器？

因为新增了 Docker volume：

```yaml
- ./data/nginx/cache:/var/cache/nginx
```

Docker 容器的挂载不会通过 `nginx -s reload` 动态增加，必须重建容器。

### 4. 为什么首页要 no-store？

Next.js chunk 文件名带 hash。HTML 如果被长期缓存，可能继续引用旧构建的 chunk。页面入口不缓存，可以让用户尽快拿到最新 HTML。

### 5. 为什么 chunk 可以缓存一年？

`/_next/static/` 下的文件名包含内容 hash。内容变了文件名就变，所以可以使用：

```text
Cache-Control: public, max-age=31536000, immutable
```

## 九、回滚方式

如果 Nginx 启动失败或配置需要回退：

1. 恢复旧版 `nginx-admin.conf`。
2. 可保留 `./data/nginx/cache:/var/cache/nginx`，它不会影响业务。
3. 检查语法：

```bash
sudo docker exec nginx nginx -t
```

4. 重载：

```bash
sudo docker exec nginx nginx -s reload
```

如容器无法正常运行，可重建：

```bash
sudo docker compose up -d --force-recreate nginx
```

