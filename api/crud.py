import re
import time
from datetime import datetime
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from . import models, schemas

# Selenium Imports
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager

# --- ヘルパー関数 ---

def extract_tweet_id_from_url(url: str) -> Optional[str]:
    """ツイートURLからツイートIDを抽出する"""
    match = re.search(r'status/(\d+)', url)
    if match:
        return match.group(1)
    return None

def setup_driver() -> webdriver.Chrome:
    """Selenium WebDriverをセットアップする"""
    options = webdriver.ChromeOptions()
    options.add_argument("--headless")  # GUIなしで実行
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--lang=ja-JP") # 日本語のページで情報を取得
    options.add_experimental_option('excludeSwitches', ['enable-logging'])
    
    service = ChromeService(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    return driver

def scrape_tweet_data_with_selenium(url: str) -> Optional[Dict]:
    """Seleniumを使って単一のツイートページからデータをスクレイピングする"""
    driver = setup_driver()
    try:
        driver.get(url)
        # 記事全体が読み込まれるのを待つ (data-testid='tweet' を持つ要素)
        wait = WebDriverWait(driver, 15)
        article = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "article[data-testid='tweet']")))

        # 著者名 (@screen_name)
        try:
            author_element = article.find_element(By.CSS_SELECTOR, "div[data-testid='User-Name'] a")
            author_name = author_element.text
            screen_name_element = author_element.find_element(By.xpath, ".//following-sibling::div")
            author_screen_name = screen_name_element.text.replace('@', '')
        except NoSuchElementException:
            author_name = "Unknown Author"
            author_screen_name = "unknown"

        # ツイート本文
        try:
            text_element = article.find_element(By.CSS_SELECTOR, "div[data-testid='tweetText']")
            text = text_element.text
        except NoSuchElementException:
            text = "Tweet text not found."
            
        # 投稿日時
        try:
            time_element = article.find_element(By.css_selector, "time")
            posted_at_str = time_element.get_attribute("datetime")
            posted_at = datetime.fromisoformat(posted_at_str.replace('Z', '+00:00'))
        except (NoSuchElementException, TypeError):
            posted_at = datetime.now()


        # 画像URLの取得
        media_urls = []
        try:
            # 少し待ってから画像要素を探す
            time.sleep(1) 
            photo_elements = article.find_elements(By.CSS_SELECTOR, "div[data-testid='tweetPhoto'] img")
            for elem in photo_elements:
                src = elem.get_attribute('src')
                if src:
                    # URLからクエリパラメータ(?format=jpg&name=largeなど)を削除し、オリジナル画質に近づける
                    base_url = src.split('?')[0]
                    media_urls.append(f"{base_url}?format=jpg&name=orig")

        except NoSuchElementException:
            pass # 画像がない場合は何もしない

        return {
            "text": text,
            "author_name": author_name,
            "author_screen_name": author_screen_name,
            "posted_at": posted_at,
            "media_urls": media_urls
        }

    except TimeoutException:
        print(f"Timeout while trying to load tweet: {url}")
        return None
    except Exception as e:
        print(f"An error occurred during scraping: {e}")
        return None
    finally:
        driver.quit()

# --- (Folder, Tag CRUD - 変更なし) ---
def get_folder_by_name(db: Session, name: str):
    return db.query(models.Folder).filter(models.Folder.name == name).first()
# ... (rest of Folder/Tag CRUD is unchanged)
def get_folders(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Folder).offset(skip).limit(limit).all()

def create_folder(db: Session, folder: schemas.FolderCreate):
    db_folder = models.Folder(name=folder.name)
    db.add(db_folder)
    db.commit()
    db.refresh(db_folder)
    return db_folder

def get_tag_by_name(db: Session, name: str):
    return db.query(models.Tag).filter(models.Tag.name == name).first()

def get_tags(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Tag).order_by(models.Tag.name).offset(skip).limit(limit).all()

def create_tag(db: Session, tag: schemas.TagCreate):
    db_tag = models.Tag(name=tag.name)
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    return db_tag
# --- Post CRUD ---

def get_posts(db: Session, skip: int = 0, limit: int = 10, sort_order: str = 'desc'):
    """投稿を複数取得する（ソート対応）"""
    query = db.query(models.Post)
    if sort_order == 'asc':
        query = query.order_by(models.Post.posted_at.asc().nullslast())
    else:
        query = query.order_by(models.Post.posted_at.desc().nullslast())
    return query.offset(skip).limit(limit).all()

def get_post(db: Session, post_id: int):
    """単一の投稿を取得する"""
    return db.query(models.Post).filter(models.Post.id == post_id).first()

def get_posts_by_folder(db: Session, folder_id: int, skip: int = 0, limit: int = 10, sort_order: str = 'desc'):
    """フォルダIDで投稿を絞り込み、ソートして取得する"""
    query = db.query(models.Post).filter(models.Post.folder_id == folder_id)
    if sort_order == 'asc':
        query = query.order_by(models.Post.posted_at.asc().nullslast())
    else:
        query = query.order_by(models.Post.posted_at.desc().nullslast())
    return query.offset(skip).limit(limit).all()

def get_posts_by_tags_and(db: Session, tag_names: List[str], skip: int = 0, limit: int = 10, sort_order: str = 'desc'):
    """複数のタグ（AND検索）で投稿を絞り込み、ソートして取得する"""
    query = db.query(models.Post)
    for name in tag_names:
        query = query.filter(models.Post.tags.any(models.Tag.name == name))
    
    if sort_order == 'asc':
        query = query.order_by(models.Post.posted_at.asc().nullslast())
    else:
        query = query.order_by(models.Post.posted_at.desc().nullslast())
        
    return query.offset(skip).limit(limit).all()

def create_post(db: Session, post: schemas.PostCreate):
    tweet_id = extract_tweet_id_from_url(post.url)
    if not tweet_id:
        return None

    existing_post = db.query(models.Post).filter(models.Post.tweet_id == tweet_id).first()
    if existing_post:
        return existing_post

    # API呼び出しからスクレイピング呼び出しに変更
    scraped_data = scrape_tweet_data_with_selenium(post.url)

    if not scraped_data:
        # スクレイピング失敗時はURLとIDのみで保存
        db_post = models.Post(url=post.url, tweet_id=tweet_id, text="Failed to scrape tweet data.")
    else:
        db_post = models.Post(
            url=post.url,
            tweet_id=tweet_id,
            text=scraped_data.get("text"),
            author_name=scraped_data.get("author_name"),
            author_screen_name=scraped_data.get("author_screen_name"),
            posted_at=scraped_data.get("posted_at"),
            media_urls=scraped_data.get("media_urls", []),
            favorite_count=0, # スクレイピングでは取得が難しいので0に
            folder_id=post.folder_id
        )

    # タグの処理 (変更なし)
    tag_objects = []
    if post.tags:
        for tag_name in post.tags:
            tag_name_stripped = tag_name.strip()
            if tag_name_stripped:
                tag = get_tag_by_name(db, name=tag_name_stripped)
                if not tag:
                    tag = models.Tag(name=tag_name_stripped)
                    db.add(tag)
                tag_objects.append(tag)
    
    db_post.tags = tag_objects

    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post

def update_post_tags(db: Session, post_id: int, tags: List[str]):
    """投稿のタグを更新する"""
    db_post = get_post(db, post_id=post_id)
    if not db_post:
        return None

    # 新しいタグのリストを作成
    new_tags = []
    for tag_name in tags:
        tag_name_stripped = tag_name.strip()
        if tag_name_stripped:
            tag = get_tag_by_name(db, name=tag_name_stripped)
            if not tag:
                # 存在しないタグは新しく作成し、セッションに追加
                tag = models.Tag(name=tag_name_stripped)
                db.add(tag)
            new_tags.append(tag)
    
    # 投稿のタグを新しいリストに更新
    db_post.tags = new_tags
    
    db.commit()
    db.refresh(db_post)
    return db_post