import argparse
import os
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote, urlsplit


SITE_ROOT = Path(__file__).resolve().parent
DOWNLOADS = SITE_ROOT / "downloads"
DOWNLOAD_ROUTES = {"/downloads/mod", "/downloads/DungeonSelects-fabric.jar"}
ASSET_FOLDERS = {"css", "fonts", "images", "js"}


class SiteHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=SITE_ROOT, **kwargs)

    def send_head(self):
        if urlsplit(self.path).path in DOWNLOAD_ROUTES:
            return self.send_mod()

        path = Path(self.translate_path(self.path)).resolve()
        if path == SITE_ROOT or path == SITE_ROOT / "index.html":
            return super().send_head()
        if path.is_relative_to(SITE_ROOT) and path.is_file():
            if path.relative_to(SITE_ROOT).parts[0] in ASSET_FOLDERS:
                return super().send_head()
        self.send_error(404)

    def send_mod(self):
        try:
            with os.scandir(DOWNLOADS) as entries:
                latest = max(
                    (
                        (entry.stat().st_mtime_ns, entry.name)
                        for entry in entries
                        if entry.name.lower().endswith(".jar")
                        and entry.is_file(follow_symlinks=False)
                    ),
                    default=None,
                )
            if latest is None:
                self.send_error(404, "Mod file unavailable")
                return
            name = latest[1]
            file = (DOWNLOADS / name).open("rb")
        except FileNotFoundError:
            self.send_error(404, "Mod file unavailable")
            return
        except OSError:
            self.send_error(503, "Could not open the mod file")
            return

        try:
            self.send_response(200)
            self.send_header("Content-Type", "application/java-archive")
            self.send_header("Content-Length", str(os.fstat(file.fileno()).st_size))
            self.send_header("Content-Disposition", f"attachment; filename*=UTF-8''{quote(name)}")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
        except OSError:
            file.close()
            raise
        return file


def main():
    parser = argparse.ArgumentParser(description="DungeonSelects")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--open", action="store_true", help="Open the site in the default browser")
    options = parser.parse_args()

    DOWNLOADS.mkdir(exist_ok=True)
    with ThreadingHTTPServer(("127.0.0.1", options.port), SiteHandler) as server:
        url = f"http://127.0.0.1:{server.server_port}/"
        print(f"DungeonSelects: {url}", flush=True)
        if options.open:
            webbrowser.open(url)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
