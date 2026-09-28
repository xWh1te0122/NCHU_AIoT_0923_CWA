import os
import sys

# 將專案根目錄加入路徑，使 Flask 應用可以被正確載入
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import app

# 為了在 Vercel 運作，只需要匯出 app 物件即可
