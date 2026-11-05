from geventwebsocket.handler import WebSocketHandler


class SafeWebSocketHandler(WebSocketHandler):
    """Keep access/error monitoring, but never log OAuth codes or signed-media queries."""
    def format_request(self):
        original = self.requestline
        parts = (original or '').split(' ', 2)
        if len(parts) == 3:
            parts[1] = parts[1].partition('?')[0].partition('#')[0]
            self.requestline = ' '.join(parts)
        try:
            return super().format_request()
        finally:
            self.requestline = original
