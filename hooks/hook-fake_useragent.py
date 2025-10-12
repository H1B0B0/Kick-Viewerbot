from PyInstaller.utils.hooks import collect_all

# Collect all data files, submodules, and binaries from fake_useragent
datas, binaries, hiddenimports = collect_all('fake_useragent')
