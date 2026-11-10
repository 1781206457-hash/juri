# Vercel Python Serverless Function - 本地开发也能跑
# URL 映射: /proxy?url=https://feeds.bbci.co.uk/news/world/rss.xml
# 说明：
#   - Vercel Runtime: python3.9（免费版也支持）
#   - 超时：默认 10s，拉 RSS 足够
#   - 出口网络：Vercel 美国/欧洲节点直连 CNN/BBC/Reuters/WIPO/EDPB 等没问题
#   - CORS：Vercel Function 默认支持跨域

import json
import urllib.request
import urllib.parse
import ssl

ALLOWED_SCHEMES = ("http://", "https://")

# 简单 UA 池，模拟浏览器避免 Cloudflare/反爬
USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
]


def _fetch(url):
    if not url.startswith(ALLOWED_SCHEMES):
        raise ValueError("only http/https allowed")
    host = urllib.parse.urlparse(url).hostname
    if host in ("localhost", "127.0.0.1", "0.0.0.0"):
        raise ValueError("no localhost")

    # Vercel 出口证书链干净，不需要 verify=False；但某些老站证书有问题，保持宽松
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(url, headers={
        "User-Agent": USER_AGENTS[hash(url) % len(USER_AGENTS)],
        "Accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    })
    with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
        return resp.read(), resp.headers.get("Content-Type", "application/xml")


def handler(event, context):
    """Vercel / AWS Lambda 风格 handler"""
    qs = event.get("queryStringParameters") or {}
    url = (qs.get("url") or "").strip()
    if not url:
        return _json(400, {"ok": False, "error": "missing url param"})

    try:
        body, ct = _fetch(url)
        return {
            "statusCode": 200,
            "headers": _cors_headers({"Content-Type": ct + "; charset=utf-8"}),
            "body": body.decode("utf-8", errors="replace"),
        }
    except Exception as e:
        return _json(502, {
            "ok": False,
            "error": f"{type(e).__name__}: {e}",
            "url": url,
        })


def _json(code, obj):
    return {
        "statusCode": code,
        "headers": _cors_headers({"Content-Type": "application/json; charset=utf-8"}),
        "body": json.dumps(obj, ensure_ascii=False),
    }


def _cors_headers(extra=None):
    h = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
    }
    if extra:
        h.update(extra)
    return h


# —————————————————————————————
# 本地开发兼容：直接 python3 api/proxy.py 也能跑
# —————————————————————————————
if __name__ == "__main__":
    import http.server
    import sys

    class DevHandler(http.server.BaseHTTPRequestHandler):
        def log_message(self, fmt, *args):
            sys.stderr.write("[dev-proxy] " + (fmt % args) + "\n")

        def do_OPTIONS(self):
            self.send_response(204)
            for k, v in _cors_headers().items():
                self.send_header(k, v)
            self.end_headers()

        def do_GET(self):
            parsed = urllib.parse.urlparse(self.path)
            if parsed.path != "/proxy":
                self.send_response(404); self.end_headers(); return
            qs = urllib.parse.parse_qs(parsed.query)
            mock_event = {"queryStringParameters": {k: v[0] for k, v in qs.items()}}
            resp = handler(mock_event, None)
            self.send_response(resp["statusCode"])
            for k, v in resp["headers"].items():
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(resp["body"].encode("utf-8"))

    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
    print(f"[dev-proxy] http://127.0.0.1:{port}/proxy")
    http.server.HTTPServer(("127.0.0.1", port), DevHandler).serve_forever()
