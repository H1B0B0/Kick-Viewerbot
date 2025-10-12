"""
Runtime hook for fake_useragent to fix data file location in PyInstaller builds.
"""
import os
import sys

# In PyInstaller onefile mode, temporary files are extracted to sys._MEIPASS
if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    # Patch fake_useragent to look in the correct location
    import fake_useragent

    # Get the temporary extraction path
    meipass = sys._MEIPASS

    # Update the data path for fake_useragent
    fake_ua_data_dir = os.path.join(meipass, 'fake_useragent', 'data')

    # Monkey patch the package path if needed
    if os.path.exists(fake_ua_data_dir):
        print(f"[PyInstaller] fake_useragent data found at: {fake_ua_data_dir}")
        # Store the correct path for fake_useragent to find
        fake_useragent.utils.DATA_DIR = fake_ua_data_dir
