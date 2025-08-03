#!/usr/bin/env python3
"""
Backend Test Suite for AutoLearn JP
Tests authentication, file upload/parsing, and word API endpoints
"""

import requests
import json
import os
import tempfile
from typing import Dict, Any, Optional

# Get base URL from environment
BASE_URL = "https://d68e43ef-b93a-4287-a9e8-2f013f952d2e.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class AutoLearnJPTester:
    def __init__(self):
        self.session = requests.Session()
        self.session_cookie = None
        
    def log_test(self, test_name: str, success: bool, message: str = ""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
    def test_root_endpoint(self) -> bool:
        """Test the root API endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/")
            print(f"DEBUG: Response status: {response.status_code}")
            print(f"DEBUG: Response text: {response.text}")
            print(f"DEBUG: Response headers: {dict(response.headers)}")
            
            success = response.status_code == 200 and "AutoLearn JP API" in response.text
            self.log_test("Root Endpoint", success, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("Root Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_admin_login(self) -> bool:
        """Test admin login with correct credentials"""
        try:
            login_data = {
                "username": "admin",
                "password": "autolearn2024"
            }
            
            response = self.session.post(
                f"{API_BASE}/auth/login",
                json=login_data,
                headers={"Content-Type": "application/json"}
            )
            
            success = response.status_code == 200
            if success:
                data = response.json()
                success = data.get("username") == "admin" and data.get("role") == "admin"
                # Store session cookie for subsequent requests
                if 'session' in response.cookies:
                    self.session_cookie = response.cookies['session']
                    
            self.log_test("Admin Login", success, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("Admin Login", False, f"Exception: {str(e)}")
            return False
    
    def test_guest_login(self) -> bool:
        """Test guest login with correct credentials"""
        try:
            # First logout if logged in
            self.session.post(f"{API_BASE}/auth/logout")
            
            login_data = {
                "username": "guest", 
                "password": "guest"
            }
            
            response = self.session.post(
                f"{API_BASE}/auth/login",
                json=login_data,
                headers={"Content-Type": "application/json"}
            )
            
            success = response.status_code == 200
            if success:
                data = response.json()
                success = data.get("username") == "guest" and data.get("role") == "guest"
                    
            self.log_test("Guest Login", success, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("Guest Login", False, f"Exception: {str(e)}")
            return False
    
    def test_invalid_login(self) -> bool:
        """Test login with invalid credentials"""
        try:
            # First logout if logged in
            self.session.post(f"{API_BASE}/auth/logout")
            
            login_data = {
                "username": "invalid",
                "password": "wrong"
            }
            
            response = self.session.post(
                f"{API_BASE}/auth/login",
                json=login_data,
                headers={"Content-Type": "application/json"}
            )
            
            success = response.status_code == 401
            self.log_test("Invalid Login", success, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("Invalid Login", False, f"Exception: {str(e)}")
            return False
    
    def test_session_check(self) -> bool:
        """Test session verification"""
        try:
            # First login as admin
            self.test_admin_login()
            
            response = self.session.get(f"{API_BASE}/auth/check")
            success = response.status_code == 200
            if success:
                data = response.json()
                success = "username" in data and "role" in data
                
            self.log_test("Session Check", success, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("Session Check", False, f"Exception: {str(e)}")
            return False
    
    def test_logout(self) -> bool:
        """Test logout functionality"""
        try:
            # First login
            self.test_admin_login()
            
            # Then logout
            response = self.session.post(f"{API_BASE}/auth/logout")
            success = response.status_code == 200
            
            # Verify session is invalid after logout
            if success:
                check_response = self.session.get(f"{API_BASE}/auth/check")
                success = check_response.status_code == 401
                
            self.log_test("Logout", success, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("Logout", False, f"Exception: {str(e)}")
            return False
    
    def test_unauthorized_access(self) -> bool:
        """Test accessing protected endpoints without authentication"""
        try:
            # Ensure we're logged out
            self.session.post(f"{API_BASE}/auth/logout")
            
            # Try to access words endpoint
            response = self.session.get(f"{API_BASE}/words")
            success = response.status_code == 401
            
            self.log_test("Unauthorized Access", success, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("Unauthorized Access", False, f"Exception: {str(e)}")
            return False
    
    def create_test_markdown_file(self) -> str:
        """Create a test markdown file with the provided content"""
        content = """## 🈶 Kanji : 火 - Feu

- Lecture *onyomi* : カ (ka)  
- Lecture *kunyomi* : ひ (hi), ほ (ho)
- Traduction FR : Feu / Flamme
- Traduction EN : Fire / Flame
- Type : #nom
- Thème : #environnement 
- Tags : #kanji #japonais #JLPTN5
"""
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False, encoding='utf-8') as f:
            f.write(content)
            return f.name
    
    def test_file_upload_and_parsing(self) -> bool:
        """Test file upload and markdown parsing"""
        try:
            # Login as admin first
            if not self.test_admin_login():
                self.log_test("File Upload", False, "Failed to login as admin")
                return False
            
            # Create test file
            test_file_path = self.create_test_markdown_file()
            
            try:
                # Upload file
                with open(test_file_path, 'rb') as f:
                    files = {'files': ('test_kanji.md', f, 'text/markdown')}
                    response = self.session.post(f"{API_BASE}/upload", files=files)
                
                success = response.status_code == 200
                if success:
                    data = response.json()
                    success = data.get("processed", 0) > 0
                    
                self.log_test("File Upload", success, f"Status: {response.status_code}, Processed: {data.get('processed', 0) if success else 'N/A'}")
                return success
                
            finally:
                # Clean up temp file
                os.unlink(test_file_path)
                
        except Exception as e:
            self.log_test("File Upload", False, f"Exception: {str(e)}")
            return False
    
    def test_guest_upload_forbidden(self) -> bool:
        """Test that guest users cannot upload files"""
        try:
            # Login as guest
            if not self.test_guest_login():
                self.log_test("Guest Upload Forbidden", False, "Failed to login as guest")
                return False
            
            # Create test file
            test_file_path = self.create_test_markdown_file()
            
            try:
                # Try to upload file as guest
                with open(test_file_path, 'rb') as f:
                    files = {'files': ('test_kanji.md', f, 'text/markdown')}
                    response = self.session.post(f"{API_BASE}/upload", files=files)
                
                success = response.status_code == 403
                self.log_test("Guest Upload Forbidden", success, f"Status: {response.status_code}")
                return success
                
            finally:
                # Clean up temp file
                os.unlink(test_file_path)
                
        except Exception as e:
            self.log_test("Guest Upload Forbidden", False, f"Exception: {str(e)}")
            return False
    
    def test_upload_no_files(self) -> bool:
        """Test upload endpoint with no files"""
        try:
            # Login as admin
            if not self.test_admin_login():
                return False
            
            # Send empty form data
            response = self.session.post(f"{API_BASE}/upload", files={})
            success = response.status_code == 400
            
            self.log_test("Upload No Files", success, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("Upload No Files", False, f"Exception: {str(e)}")
            return False
    
    def test_words_api(self) -> bool:
        """Test words API endpoint"""
        try:
            # Login first
            if not self.test_admin_login():
                return False
            
            # Upload a test file first to ensure we have data
            self.test_file_upload_and_parsing()
            
            # Get words
            response = self.session.get(f"{API_BASE}/words")
            success = response.status_code == 200
            
            if success:
                data = response.json()
                success = isinstance(data, list)
                
                # If we have words, verify structure
                if data:
                    word = data[0]
                    expected_fields = ['id', 'kanji', 'traductionFr', 'onyomi', 'kunyomi', 'traductionEn', 'type', 'theme', 'tags']
                    has_required_fields = all(field in word for field in ['id', 'kanji'])
                    success = success and has_required_fields
                    
                    self.log_test("Words API", success, f"Status: {response.status_code}, Words count: {len(data)}")
                else:
                    self.log_test("Words API", success, f"Status: {response.status_code}, No words found")
            else:
                self.log_test("Words API", success, f"Status: {response.status_code}")
                
            return success
        except Exception as e:
            self.log_test("Words API", False, f"Exception: {str(e)}")
            return False
    
    def test_markdown_parsing_accuracy(self) -> bool:
        """Test that markdown parsing extracts all metadata correctly"""
        try:
            # Login as admin
            if not self.test_admin_login():
                return False
            
            # Upload test file and get words
            if not self.test_file_upload_and_parsing():
                return False
            
            response = self.session.get(f"{API_BASE}/words")
            if response.status_code != 200:
                self.log_test("Markdown Parsing Accuracy", False, "Failed to get words")
                return False
            
            words = response.json()
            if not words:
                self.log_test("Markdown Parsing Accuracy", False, "No words found")
                return False
            
            # Find our test word (火)
            test_word = None
            for word in words:
                if word.get('kanji') == '火':
                    test_word = word
                    break
            
            if not test_word:
                self.log_test("Markdown Parsing Accuracy", False, "Test word '火' not found")
                return False
            
            # Verify all expected fields are parsed correctly
            expected_values = {
                'kanji': '火',
                'traductionFr': 'Feu',
                'onyomi': 'カ (ka)',
                'kunyomi': 'ひ (hi), ほ (ho)',
                'traductionEn': 'Fire / Flame',
                'type': 'nom',
                'theme': 'environnement'
            }
            
            success = True
            missing_fields = []
            incorrect_values = []
            
            for field, expected_value in expected_values.items():
                actual_value = test_word.get(field)
                if not actual_value:
                    missing_fields.append(field)
                    success = False
                elif expected_value not in actual_value:
                    incorrect_values.append(f"{field}: expected '{expected_value}', got '{actual_value}'")
                    success = False
            
            # Check tags
            tags = test_word.get('tags', [])
            expected_tags = ['kanji', 'japonais', 'JLPTN5']
            if not all(tag in tags for tag in expected_tags):
                incorrect_values.append(f"tags: expected {expected_tags}, got {tags}")
                success = False
            
            message = "All fields parsed correctly"
            if missing_fields:
                message += f", Missing: {missing_fields}"
            if incorrect_values:
                message += f", Incorrect: {incorrect_values}"
            
            self.log_test("Markdown Parsing Accuracy", success, message)
            return success
            
        except Exception as e:
            self.log_test("Markdown Parsing Accuracy", False, f"Exception: {str(e)}")
            return False
    
    def test_invalid_route(self) -> bool:
        """Test accessing non-existent route"""
        try:
            # Login first
            if not self.test_admin_login():
                return False
            
            response = self.session.get(f"{API_BASE}/nonexistent")
            success = response.status_code == 404
            
            self.log_test("Invalid Route", success, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("Invalid Route", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self) -> Dict[str, bool]:
        """Run all tests and return results"""
        print("🧪 Starting AutoLearn JP Backend Tests")
        print("=" * 50)
        
        tests = [
            ("Root Endpoint", self.test_root_endpoint),
            ("Admin Login", self.test_admin_login),
            ("Guest Login", self.test_guest_login),
            ("Invalid Login", self.test_invalid_login),
            ("Session Check", self.test_session_check),
            ("Logout", self.test_logout),
            ("Unauthorized Access", self.test_unauthorized_access),
            ("File Upload & Parsing", self.test_file_upload_and_parsing),
            ("Guest Upload Forbidden", self.test_guest_upload_forbidden),
            ("Upload No Files", self.test_upload_no_files),
            ("Words API", self.test_words_api),
            ("Markdown Parsing Accuracy", self.test_markdown_parsing_accuracy),
            ("Invalid Route", self.test_invalid_route),
        ]
        
        results = {}
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            try:
                result = test_func()
                results[test_name] = result
                if result:
                    passed += 1
            except Exception as e:
                print(f"❌ FAIL {test_name}: Unexpected error - {str(e)}")
                results[test_name] = False
        
        print("\n" + "=" * 50)
        print(f"🏁 Test Summary: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed!")
        else:
            print("⚠️  Some tests failed. Check the logs above for details.")
        
        return results

def main():
    """Main test runner"""
    tester = AutoLearnJPTester()
    results = tester.run_all_tests()
    
    # Exit with error code if any tests failed
    failed_tests = [name for name, result in results.items() if not result]
    if failed_tests:
        print(f"\n❌ Failed tests: {', '.join(failed_tests)}")
        exit(1)
    else:
        print("\n✅ All tests passed successfully!")
        exit(0)

if __name__ == "__main__":
    main()