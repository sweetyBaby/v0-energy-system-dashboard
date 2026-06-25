0、本地打包镜像（在项目根目录，同时要打开docker desktop）
docker build -t energy-dashboard:latest . 
docker save -o energy-dashboard.tar energy-dashboard:latest
1、传docker镜像到 /home/bms/base_docker/data/myapp/front
2、cd /home/bms/base_docker/data/myapp/front
执行 sudo docker load -i energy-dashboard.tar
3、cd  /home/bms/base_docker
执行 sudo docker compose up -d --force-recreate energy-dashboard