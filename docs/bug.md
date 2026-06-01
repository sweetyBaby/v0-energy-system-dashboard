这次问题是两层叠加，不是单点故障。

第一层是 `API_BASE_URL` 配错了。  
本地 `.env.development` 原来写的是 `http://223.107.76.50:9016/api`，但你服务器上 Nginx 真正代理后端 Java 接口的是 `/prod-api/`，不是 `/api/`。  
所以本地 `http://localhost:3000/api/proxy/login/cloud` 被 Next 转发时，目标地址其实配错了。这个我改成了 [.env.development](<E:\01_code\v0-energy-system-dashboard\.env.development:4>) 里的：
`API_BASE_URL=http://223.107.76.50:9016/prod-api`

第二层是 Next 代理路由透传请求头/响应头太“原样”了。  
[app/api/proxy/[...path]/route.ts](<E:\01_code\v0-energy-system-dashboard\app\api\proxy\[...path]\route.ts:1>) 之前把浏览器来的头几乎整包转给上游，导致两个具体问题：

1. 请求头里的 `Expect` 被转发到上游  
   Node/undici 的 `fetch` 不支持这个头，直接报：
   `fetch failed: expect header not supported`

2. 上游响应体已经被 Node 解压了，但代理还把 `content-encoding: gzip` 原样带回前端  
   浏览器再按 gzip 解一次，就报：
   `The magic number in GZip header is not correct`

另外还有一个表象问题：  
[lib/api-client.ts](<E:\01_code\v0-energy-system-dashboard\lib\api-client.ts:47>) 之前对“空响应/非 JSON 响应”容错太松，会把 `null` 往下传，登录页继续读 `response.code`，于是出现：
`Cannot read properties of null (reading 'code')`
这个不是根因，只是错误提示被二次放大了。

这次最终修复内容：

- `.env.development` 改成走 `9016/prod-api`
- 代理路由过滤不该转发的请求头：`connection`、`expect`、`accept-encoding`、`origin`、`referer`、`sec-*` 等
- 代理路由去掉不该回传的响应头：`content-encoding`、`transfer-encoding`
- `lib/api-client.ts` 改成遇到空响应或非 JSON 时直接抛明确错误，不再传 `null`

备忘可以记成这几条：

- 本地开发 `API_BASE_URL` 不能写前端入口路径，要写真实后端入口
- 你这台服务器外网后端代理入口是 `http://223.107.76.50:9016/prod-api`
- `/api/proxy` 是本地 Next 的代理前缀，不要写进 `API_BASE_URL`
- 反向代理不要原样透传浏览器的 hop-by-hop 头和压缩相关头
- 前端请求层不要把非 JSON/空响应默默吞成 `null`

一句话版：  
根因是“本地代理目标地址配错 + 代理层错误透传头部”，前者导致链路方向不对，后者导致即使方向改对了也会 `fetch failed`。