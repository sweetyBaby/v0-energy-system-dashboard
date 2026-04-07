# 发布回滚步骤

适用场景：

- 新前端发布后页面打不开
- 页面能打开但功能异常
- 需要快速切回上一个可用版本

建议每次发布时不要只保留 `latest`，同时打一个日期版本标签。

例如：

```powershell
docker build -t energy-dashboard:latest -t energy-dashboard:2026-04-07 .
```

## 一、查看服务器已有镜像

```bash
sudo docker images | grep energy-dashboard
```

## 二、停止并删除当前前端容器

```bash
sudo docker stop energy-dashboard
sudo docker rm energy-dashboard
```

## 三、用旧镜像重新启动

例如回滚到 `2026-04-03`：

```bash
sudo docker run -d \
  --name energy-dashboard \
  -p 3000:3000 \
  -e API_BASE_URL=http://10.10.10.17:8080 \
  --restart unless-stopped \
  energy-dashboard:2026-04-03
```

## 四、重载 Nginx

```bash
sudo docker exec 2bff3a122fdd nginx -t
sudo docker exec 2bff3a122fdd nginx -s reload
```

如果 reload 失败：

```bash
sudo docker restart 2bff3a122fdd
```

## 五、回滚后验证

```bash
sudo docker ps | grep energy-dashboard
sudo docker logs --tail 100 energy-dashboard
wget -qO- http://127.0.0.1:3000 | head
wget -qO- http://127.0.0.1:9016 | head
```

浏览器访问：

```text
http://223.107.76.50:9016/
```

## 六、如果服务器上没有旧镜像

本地导出旧版本镜像：

```powershell
docker save -o energy-dashboard-2026-04-03.tar energy-dashboard:2026-04-03
```

上传到服务器后执行：

```bash
cd /opt/myapp
sudo docker load -i energy-dashboard-2026-04-03.tar

sudo docker stop energy-dashboard
sudo docker rm energy-dashboard

sudo docker run -d \
  --name energy-dashboard \
  -p 3000:3000 \
  -e API_BASE_URL=http://10.10.10.17:8080 \
  --restart unless-stopped \
  energy-dashboard:2026-04-03
```

## 七、最小回滚命令模板

```bash
sudo docker stop energy-dashboard
sudo docker rm energy-dashboard
sudo docker run -d \
  --name energy-dashboard \
  -p 3000:3000 \
  -e API_BASE_URL=http://10.10.10.17:8080 \
  --restart unless-stopped \
  energy-dashboard:旧版本标签
```
