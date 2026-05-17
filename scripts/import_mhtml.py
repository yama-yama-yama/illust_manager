# /scripts/import_mhtml.py
import sys
import os
import re
import email
from email.message import Message
from datetime import datetime
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

# Add project root to the Python path to allow imports from `backend`
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.append(project_root)

from api.database import SessionLocal
from api.models import Post, Tag


def get_post_by_url(db: Session, url: str):
    """URLで投稿を検索する"""
    return db.query(Post).filter(Post.url == url).first()

def get_tag_by_name(db: Session, name: str):
    """タグ名でタグを検索する"""
    return db.query(Tag).filter(Tag.name == name).first()

def parse_and_import(file_path: str) -> dict:
    """
    MHTMLファイルをパースしてデータベースにインポートし、結果を返す
    """
    try:
        with open(file_path, 'rb') as f:
            msg: Message = email.message_from_binary_file(f)
        
        html_part = next((part for part in msg.walk() if part.get_content_type() == 'text/html'), None)
        
        if not html_part:
            return {"status": "failed", "file_path": file_path, "error": "No HTML content found"}

        html_content = html_part.get_payload(decode=True)
        charset = html_part.get_content_charset() or 'utf-8'
        soup = BeautifulSoup(html_content, 'lxml', from_encoding=charset)

        url = msg.get('Snapshot-Content-Location')
        if not url:
            return {"status": "failed", "file_path": file_path, "error": "Could not find 'Snapshot-Content-Location'"}

    except FileNotFoundError:
        return {"status": "failed", "file_path": file_path, "error": "File not found"}
    except Exception as e:
        return {"status": "failed", "file_path": file_path, "error": f"Error reading or parsing file: {e}"}

    # --- データ抽出ロジック ---
    post_data = {'url': url}
    try:
        tweet_id_match = re.search(r'status/(\d+)', url)
        post_data['tweet_id'] = tweet_id_match.group(1) if tweet_id_match else None

        article = soup.find("article", attrs={"data-testid": "tweet"})
        if not article:
            return {"status": "failed", "url": url, "error": "Could not find the main tweet article element"}

        user_name_div = article.find("div", attrs={"data-testid": "User-Name"})
        if user_name_div:
            spans = user_name_div.find_all("span")
            post_data['author_name'] = spans[0].text if spans else 'Unknown'
            user_id_div = user_name_div.find_next('div')
            if user_id_div:
                post_data['author_screen_name'] = ''.join(s.text for s in user_id_div.find_all('span')).replace('@', '')

        text_div = article.find("div", attrs={"data-testid": "tweetText"})
        post_data['text'] = text_div.get_text(separator='\n', strip=True) if text_div else ""

        time_tag = article.find("time")
        if time_tag and 'datetime' in time_tag.attrs:
            dt_str = time_tag['datetime']
            post_data['posted_at'] = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))

        media_urls = [
            f"{img['src'].split('?')[0]}?format=jpg&name=orig"
            for div in article.find_all("div", attrs={"data-testid": "tweetPhoto"})
            if (img := div.find("img")) and 'src' in img.attrs
        ]
        post_data['media_urls'] = media_urls

        avatar_container = article.find("div", attrs={"data-testid": re.compile(r"UserAvatar-Container-.*")})
        if avatar_container and (avatar_img := avatar_container.find("img")) and 'src' in avatar_img.attrs:
            post_data['author_avatar_url'] = avatar_img['src']
            
    except Exception as e:
        return {"status": "failed", "url": url, "error": f"An error occurred during data extraction: {e}"}

    # --- データベースへの保存処理 ---
    db: Session = SessionLocal()
    try:
        # すでに存在するかチェック
        if get_post_by_url(db, url):
             return {"status": "skipped", "url": url, "reason": "Post already exists"}

        # tags=[] を明示的に渡す必要はありません（modelのdefaultで空になります）
        db_post = Post(**post_data) 
        db.add(db_post)
        db.commit() # ここでIDエラーが出ていたはずです
        db.refresh(db_post) # 保存後の情報を取得
        return {"status": "added", "url": db_post.url}

    except Exception as e:
        db.rollback() # エラー時は必ずロールバック
        print(f"Import Error: {e}") # ログに出力
        return {"status": "failed", "url": url, "error": str(e)}
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/import_mhtml.py <directory_path>")
        sys.exit(1)
    
    dir_path = sys.argv[1]
    if not os.path.isdir(dir_path):
        print(f"Error: Provided path is not a directory: {dir_path}")
        sys.exit(1)

    print(f"Scanning directory: {dir_path}")
    results = []
    for filename in os.listdir(dir_path):
        if filename.lower().endswith(('.mhtml', '.mht')):
            file_path = os.path.join(dir_path, filename)
            result = parse_and_import(file_path)
            print(result)
            results.append(result)
    
    print("\n--- Summary ---")
    summary = {"added": 0, "skipped": 0, "failed": 0}
    for res in results:
        summary[res["status"]] += 1
    print(summary)
    print("All files processed.")

