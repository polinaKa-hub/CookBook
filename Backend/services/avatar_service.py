import os
from werkzeug.utils import secure_filename
from datetime import datetime
import uuid

class AvatarService:
    def __init__(self, use_imgbb=False, upload_folder=None):
        self.ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
        self.UPLOAD_FOLDER = upload_folder or 'uploads/avatars'
        self.use_imgbb = use_imgbb
        
        print(f"DEBUG: AvatarService initialized. Use ImgBB: {use_imgbb}, Upload folder: {self.UPLOAD_FOLDER}")
        
        if use_imgbb:
            try:
                from .imgbb_service import ImgBBService
                self.imgbb_service = ImgBBService()
                print(f"DEBUG: ImgBBService loaded successfully")
            except ImportError as e:
                print(f"ERROR: Cannot import ImgBBService: {e}")
                self.use_imgbb = False
        else:
            self.ensure_upload_folder()
    
    def ensure_upload_folder(self):
        """Убедиться, что папка для загрузок существует"""
        try:
            os.makedirs(self.UPLOAD_FOLDER, exist_ok=True)
            print(f"DEBUG: Upload folder ensured: {self.UPLOAD_FOLDER}")
        except Exception as e:
            print(f"ERROR: Cannot create upload folder: {e}")
    
    def allowed_file(self, filename):
        """Проверить допустимость расширения файла"""
        if not filename or '.' not in filename:
            return False
        ext = filename.rsplit('.', 1)[1].lower()
        result = ext in self.ALLOWED_EXTENSIONS
        print(f"DEBUG: File '{filename}' allowed: {result}")
        return result
    
    def save_avatar(self, file, user_id):
        """Сохранить аватар и вернуть URL"""
        print(f"DEBUG [AvatarService.save_avatar]: Saving avatar for user {user_id}")
        
        if not file or not file.filename:
            print("DEBUG: No file or filename provided")
            return None
        
        if not self.allowed_file(file.filename):
            print(f"DEBUG: File type not allowed: {file.filename}")
            return None
        
        # Используем ImgBB если включено
        if self.use_imgbb and hasattr(self, 'imgbb_service'):
            try:
                print(f"DEBUG: Uploading avatar to ImgBB")
                
                # Генерируем имя файла для ImgBB
                file_ext = file.filename.rsplit('.', 1)[1].lower()
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"avatar_{user_id}_{timestamp}.{file_ext}"
                
                # Загружаем на ImgBB
                avatar_url = self.imgbb_service.upload_image(
                    file=file,
                    name=filename,
                    expiration=0  # 0 = никогда не удалять
                )
                
                if avatar_url:
                    print(f"SUCCESS: Avatar uploaded to ImgBB: {avatar_url}")
                    return avatar_url
                else:
                    print(f"WARNING: Failed to upload to ImgBB, falling back to local storage")
                    # Fallback на локальное сохранение
                    return self._save_avatar_local(file, user_id)
                    
            except Exception as e:
                print(f"ERROR: Exception uploading to ImgBB: {e}")
                # Fallback на локальное сохранение
                return self._save_avatar_local(file, user_id)
        else:
            # Локальное сохранение
            return self._save_avatar_local(file, user_id)
    
    def _save_avatar_local(self, file, user_id):
        """Локальное сохранение аватара"""
        try:
            file_ext = file.filename.rsplit('.', 1)[1].lower()
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            unique_id = str(uuid.uuid4())[:8]
            filename = f"avatar_{user_id}_{timestamp}_{unique_id}.{file_ext}"
            
            # Создаем папку если не существует
            self.ensure_upload_folder()
            
            file_path = os.path.join(self.UPLOAD_FOLDER, filename)
            print(f"DEBUG: Saving locally to {file_path}")
            
            file.save(file_path)
            
            if os.path.exists(file_path):
                file_size = os.path.getsize(file_path)
                print(f"SUCCESS: Avatar saved locally, size: {file_size} bytes")
                avatar_url = f"/uploads/avatars/{filename}"
                print(f"DEBUG: Local avatar URL: {avatar_url}")
                return avatar_url
            else:
                print(f"ERROR: Avatar file not saved!")
                return None
                
        except Exception as e:
            print(f"ERROR: Exception saving avatar locally: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def delete_old_avatar(self, avatar_url):
        """Удалить старый аватар если он существует"""
        print(f"DEBUG [AvatarService.delete_old_avatar]: {avatar_url}")
        
        # Если URL от ImgBB, пропускаем удаление
        if self.use_imgbb and avatar_url and 'imgbb.com' in avatar_url:
            print(f"DEBUG: ImgBB URL - no local deletion needed")
            return
        
        # Локальное удаление
        if avatar_url and avatar_url.startswith('/uploads/avatars/'):
            filename = avatar_url.split('/')[-1]
            file_path = os.path.join(self.UPLOAD_FOLDER, filename)
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    print(f"DEBUG: Old local avatar deleted: {file_path}")
                except Exception as e:
                    print(f"DEBUG: Error deleting old avatar: {e}")
    
    def get_service_info(self):
        """Информация о сервисе"""
        return {
            'use_imgbb': self.use_imgbb,
            'upload_folder': self.UPLOAD_FOLDER,
            'allowed_extensions': list(self.ALLOWED_EXTENSIONS)
        }