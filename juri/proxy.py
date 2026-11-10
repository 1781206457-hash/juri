#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
法律英语选题工作台 - 本地 RSS 代理
-----------------------------------
作用：把浏览器里的 CORS 跨域 RSS 请求，转到本机 Python 后端来拉取。
      Python 不受浏览器同源策略限制，会用你系统的代理设置（如果开了 VPN 就自动走）。
      浏览器只访问 http://localhost:8766，永远不会被墙。

用法：
    python3 proxy.py                 # 默认 8766 端口
    python3 proxy.py --port 8888     # 自定义端口
    python3 proxy.py --host 0.0.0.0  # 允许局域网访问（谨慎）

前端自动发现此代理（默认 http://localhost:8766/proxy），
开启后会优先走它，失败再回退到公共代理链。
"""

import http.server
import urllib.request
import urllib.parse
import json
import ssl
import sys
import argparse

DEFAULT_PORT = 8766

# 允许浏览器拿到完整响应头 + body
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
}

# 可选：如果系统有 HTTP_PROXY / HTTPS_PROXY 环境变量，urllib 会自动使用
# 如果想强制指定，把下面这个 dict 里填上（格式：{'http': 'http://127.0.0.1:7890', 'https': 'http://127.0.0.1:7890'}）
CUSTOM_PROXIES = None


class ProxyHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stderr.write("[proxy] " + (fmt % args) + "\n")

    def do_OPTIONS(self):
        self.send_response(204)
        for k, v in CORS_HEADERS.items():
            self.send_header(k, v)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/proxy":
            self._json(404, {"ok": False, "error": "use /proxy?url=..."})
            return

        qs = urllib.parse.parse_qs(parsed.query)
        url = (qs.get("url") or [""])[0].strip()
        if not url:
            self._json(400, {"ok": False, "error": "missing url param"})
            return

        # 安全检查：只放行 http / https，不允许 file:// 或 loopback 内部探测
        if not (url.startswith("http://") or url.startswith("https://")):
            self._json(400, {"ok": False, "error": "only http/https allowed"})
            return
        if urllib.parse.urlparse(url).hostname in ("localhost", "127.0.0.1", "0.0.0.0"):
            self._json(400, {"ok": False, "error": "no localhost"})
            return

        try:
            # 设置代理（urllib 自动读取环境变量 HTTP_PROXY / HTTPS_PROXY）
            proxies = urllib.request.getproxies()
            if CUSTOM_PROXIES:
                proxies.update(CUSTOM_PROXIES)

            proxy_handler = urllib.request.ProxyHandler(proxies) if proxies else urllib.request.ProxyHandler({})
            # 部分源（CNN/FT）有 Cloudflare，需要模拟浏览器 UA
            req = urllib.request.Request(url, headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                              "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            })

            # 部分源证书链有问题，允许降级（生产环境请删除 SSL 相关两行）
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE

            # HTTPSHandler 携带自定义 ctx，ProxyHandler 处理网络代理
            http_handler = urllib.request.HTTPHandler()
            https_handler = urllib.request.HTTPSHandler(context=ctx)
            proxy_handler = urllib.request.ProxyHandler(proxies) if proxies else urllib.request.ProxyHandler({})
            opener = urllib.request.build_opener(proxy_handler, http_handler, https_handler)

            with opener.open(req, timeout=15) as resp:
                body = resp.read()
                content_type = resp.headers.get("Content-Type", "application/xml")
                last_modified = resp.headers.get("Last-Modified", "")

            self.send_response(200)
            self.send_header("Content-Type", content_type + "; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            for k, v in CORS_HEADERS.items():
                self.send_header(k, v)
            if last_modified:
                self.send_header("Last-Modified", last_modified)
            self.end_headers()
            self.wfile.write(body)

        except Exception as e:
            err_type = type(e).__name__
            self.send_response(502)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            for k, v in CORS_HEADERS.items():
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(json.dumps({
                "ok": False, "error": f"{err_type}: {e}", "url": url
            }).encode("utf-8"))

    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        for k, v in CORS_HEADERS.items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)


def main():
    parser = argparse.ArgumentParser(description="本地 RSS 代理 - 给法律英语选题工作台用")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--host", default="127.0.0.1")
    args = parser.parse_args()

    srv = http.server.HTTPServer((args.host, args.port), ProxyHandler)
    print(f"[proxy] 已启动: http://{args.host}:{args.port}/proxy")
    print(f"[proxy] 前端请求示例: http://{args.host}:{args.port}/proxy?url=https://feeds.bbci.co.uk/news/world/rss.xml")
    print(f"[proxy] 提示: 本工具自动读取系统代理环境变量 (HTTP_PROXY / HTTPS_PROXY)")
    print(f"[proxy] Ctrl+C 停止")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\n[proxy] 已停止")


if __name__ == "__main__":
    main()
