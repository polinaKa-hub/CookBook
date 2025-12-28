# Backend/services/imgbb_service.py
import requests
import base64
import os

class ImgBBService:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv('IMGBB_API_KEY')
        self.upload_url = "https://api.imgbb.com/1/upload"
        print(f"DEBUG: ImgBBService initialized. API Key: {'Set' if self.api_key else 'Not set'}")
    
    def upload_image(self, file, name="image", expiration=0):
        """
        Загружает изображение на ImgBB
        Возвращает URL загруженного изображения
        expiration: время жизни в секундах (0 = навсегда)
        """
        print(f"DEBUG: Uploading image '{name}' to ImgBB, expiration: {expiration}s")
        
        if not self.api_key:
            print("ERROR: ImgBB API key not found")
            return None
        
        try:
            # Читаем файл
            if hasattr(file, 'read'):
                # Если это файловый объект
                file.seek(0)
                image_data = file.read()
                file_size = len(image_data)
                print(f"DEBUG: Read {file_size} bytes from file object")
            else:
                # Если это путь к файлу
                print(f"DEBUG: Reading file from path: {file}")
                with open(file, 'rb') as f:
                    image_data = f.read()
                file_size = len(image_data)
                print(f"DEBUG: Read {file_size} bytes from file path")
            
            if file_size == 0:
                print("ERROR: Empty file")
                return None
            
            # Кодируем в base64
            b64_image = base64.b64encode(image_data).decode('utf-8')
            print(f"DEBUG: Base64 encoded, length: {len(b64_image)}")
            
            # Параметры запроса
            params = {
                'key': self.api_key,
                'image': b64_image,
                'name': name,
                'expiration': expiration
            }
            
            # Отправляем запрос
            print(f"DEBUG: Sending request to ImgBB API...")
            response = requests.post(self.upload_url, data=params, timeout=30)
            
            print(f"DEBUG: Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"DEBUG: API response: {result.get('success', 'No success field')}")
                
                if result.get('success'):
                    image_url = result['data']['url']
                    print(f"DEBUG: Image uploaded successfully: {image_url}")
                    return image_url
                else:
                    error_msg = result.get('error', {}).get('message', 'Unknown error')
                    print(f"ERROR: ImgBB API error: {error_msg}")
                    print(f"DEBUG: Full response: {result}")
                    return None
            else:
                print(f"ERROR: HTTP error {response.status_code}: {response.text[:200]}")
                return None
                
        except Exception as e:
            print(f"ERROR: Exception uploading to ImgBB: {str(e)}")
            import traceback
            traceback.print_exc()
            return None
    
    def test_connection(self):
        """Проверяет подключение к ImgBB API без создания изображений"""
        print("DEBUG: Testing ImgBB connection...")
        
        if not self.api_key:
            return {
                'success': False,
                'error': 'API key not found in environment variables',
                'status': 'no_api_key'
            }
        
        try:
            # Проверяем доступность API
            print("DEBUG: Checking API availability...")
            response = requests.get("https://api.imgbb.com", timeout=10)
            
            return {
                'success': True,
                'api_key': f"{self.api_key[:8]}..." if len(self.api_key) > 8 else "Invalid",
                'status': 'api_available',
                'http_status': response.status_code
            }
            
        except requests.exceptions.ConnectionError:
            return {
                'success': False,
                'error': 'Cannot connect to ImgBB API',
                'status': 'connection_failed'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'status': 'test_failed'
            }
    
    def test_upload_simple(self):
        """Тест загрузки с простым текстовым файлом"""
        try:
            if not self.api_key:
                return {'success': False, 'error': 'No API key'}
            
            # Создаем простой текстовый файл в памяти
            from io import BytesIO
            test_content = b"Simple test file"
            test_file = BytesIO(test_content)
            test_file.name = "test.txt"
            
            # Пробуем загрузить (ImgBB может не принимать текстовые файлы)
            test_url = self.upload_image(test_file, name="test_file", expiration=60)
            
            return {
                'success': test_url is not None,
                'test_url': test_url,
                'status': 'upload_success' if test_url else 'upload_failed'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'status': 'test_exception'
            }