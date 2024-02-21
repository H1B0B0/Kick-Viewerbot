import requests
from twitchbot.viewer_bot import ViewerBot

def test_valid_parameters():
    bot = ViewerBot(nb_of_threads=5, channel_name='test_channel', proxylist=None, type_of_proxy='http', proxy_imported=False, timeout=1000)
    assert bot.nb_of_threads == 5
    assert bot.channel_url == 'https://www.twitch.tv/test_channel'
    assert bot.proxylist == None
    assert bot.type_of_proxy == 'http'
    assert bot.proxy_imported == False
    assert bot.timeout == 1000
    assert bot.stop_event == False
    assert bot.all_proxies == []
    assert bot.proxyrefreshed == True
    assert bot.proxyreturned1time == False
    assert bot.nb_requests == 0

def test_get_proxies_returns_list():
    bot = ViewerBot(nb_of_threads=5, channel_name='test_channel', proxylist=None, type_of_proxy='http', proxy_imported=False, timeout=1000)
    proxies = bot.get_proxies()
    assert isinstance(proxies, list)

# Tests that the open_url method successfully opens a stream URL with a valid proxy
# def test_open_url_with_valid_proxy():
#     bot = ViewerBot(nb_of_threads=5, channel_name='test_channel', proxylist=None, type_of_proxy='http', proxy_imported=False, timeout=1000)
#     url = "http://www.google.com"
#     response = bot.open_url(url)
#     assert response.status_code == 200
#     assert response.content is not None

# def test_get_valid_stream_url():
#     bot = ViewerBot(nb_of_threads=5, channel_name='test_channel', proxylist=None, type_of_proxy='http', proxy_imported=False, timeout=1000)
#     url = bot.get_url()
#     assert url.startswith('http')
#     assert url.endswith('.m3u8')

# def test_create_session_returns_session_object():
#     bot = ViewerBot(nb_of_threads=5, channel_name='test_channel', proxylist=None, type_of_proxy='http', proxy_imported=False, timeout=1000)
#     session = bot.create_session()
#     assert isinstance(session, requests.Session)

