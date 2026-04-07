# 异常排查 Checklist

## 1. 本地构建失败

```powershell
docker version
docker context ls
```

重新构建：

```powershell
cd E:\01_code\v0-energy-system-dashboard
docker build -t energy-dashboard:latest .
```

## 2. 服务器导入镜像失败

```bash
cd /opt/myapp
ls -lh energy-dashboard.tar
sudo docker load -i energy-dashboard.tar
```

## 3. 前端容器没起来

```bash
sudo docker ps -a | grep energy-dashboard
sudo docker logs --tail 200 energy-dashboard
```

必要时重建：

```bash
sudo docker stop energy-dashboard 2>/dev/null
sudo docker rm energy-dashboard 2>/dev/null

sudo docker run -d \
  --name energy-dashboard \
  -p 3000:3000 \
  -e API_BASE_URL=http://10.10.10.17:8080 \
  --restart unless-stopped \
  energy-dashboard:latest
```

## 4. 前端容器启动了，但页面打不开

```bash
wget -qO- http://127.0.0.1:3000 | head
ss -lntp | grep 3000
```

## 5. Nginx 没生效

```bash
sudo docker exec 2bff3a122fdd nginx -t
sudo docker exec 2bff3a122fdd nginx -s reload
```

如果不行：

```bash
sudo docker restart 2bff3a122fdd
```

再测：

```bash
wget -qO- http://127.0.0.1:9016 | head
```

## 6. 外网 `223.107.76.50:9016` 打不开

```bash
wget -qO- http://127.0.0.1:9016 | head
```

如果本机正常但外部打不开，通常是网络层问题：

- 外网入口没放开 `9016`
- 网关或安全策略限制
- 外部 IP 与当前服务器映射关系不对

## 7. 页面能打开，但接口报错

先确认前端环境变量：

```bash
sudo docker inspect energy-dashboard | grep API_BASE_URL
```

正确值应为：

```text
http://10.10.10.17:8080
```

再确认后端本机可访问：

```bash
wget -qO- http://10.10.10.17:8080 | head
```

## 8. Nginx 配置改了，但没生效

```bash
cat /opt/myapp/frontend-test/nginx.conf
sudo docker inspect 2bff3a122fdd
```

重点看 `Mounts` 是否挂载了正确配置文件。

## 9. 核心检查命令

```bash
sudo docker ps
sudo docker logs --tail 100 energy-dashboard
sudo docker inspect energy-dashboard | grep API_BASE_URL
sudo docker exec 2bff3a122fdd nginx -t
wget -qO- http://127.0.0.1:3000 | head
wget -qO- http://127.0.0.1:9016 | head
```

## 10. 当前正确目标状态

- `energy-dashboard` 容器是 `Up`
- `API_BASE_URL=http://10.10.10.17:8080`
- `http://127.0.0.1:3000` 能返回前端 HTML
- `http://127.0.0.1:9016` 能返回前端 HTML
- 浏览器访问 `http://223.107.76.50:9016/` 能打开页面
