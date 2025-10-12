from PyInstaller.utils.hooks import collect_all, collect_dynamic_libs

# Collect all data files, submodules, and binaries from tls_client
datas, binaries, hiddenimports = collect_all('tls_client')

# Also collect dynamic libraries
binaries += collect_dynamic_libs('tls_client')
