import tempfile
from pathlib import Path

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from .models import StoredFile, User


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class CloudApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", full_name="Test User", email="test@example.com", password="Pass1!")
        self.other = User.objects.create_user(username="otheruser", full_name="Other User", email="other@example.com", password="Pass1!")
        self.admin = User.objects.create_superuser(username="admin", full_name="Admin", email="admin@example.com", password="Admin1!")

    def login(self, username="testuser", password="Pass1!"):
        response = self.client.post("/api/auth/login/", {"username": username, "password": password}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_registration_validates_username_and_password(self):
        response = self.client.post("/api/auth/register/", {"username": "1bad", "full_name": "Bad", "email": "bad@example.com", "password": "weak"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)
        self.assertIn("password", response.data)

    def test_upload_list_update_share_and_download(self):
        self.login()
        upload = SimpleUploadedFile("report.txt", b"hello cloud", content_type="text/plain")
        response = self.client.post("/api/files/", {"file": upload, "comment": "draft"}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        file_id = response.data["id"]
        response = self.client.patch(f"/api/files/{file_id}/", {"original_name": "final.txt", "comment": "ready"}, format="json")
        self.assertEqual(response.data["original_name"], "final.txt")
        response = self.client.post(f"/api/files/{file_id}/share/")
        self.assertIsNotNone(response.data["share_token"])
        public = APIClient().get(f"/api/public/{response.data['share_token']}/")
        self.assertEqual(public.status_code, status.HTTP_200_OK)

    def test_user_cannot_access_other_storage(self):
        item = StoredFile.objects.create(owner=self.other, file=SimpleUploadedFile("secret.txt", b"secret"), original_name="secret.txt", size=6)
        self.login()
        response = self.client.get(f"/api/files/{item.pk}/download/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        response = self.client.get(f"/api/files/?user_id={self.other.pk}")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_manage_users_and_their_files(self):
        self.login("admin", "Admin1!")
        response = self.client.get("/api/users/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response = self.client.patch(f"/api/users/{self.other.pk}/", {"is_staff": True}, format="json")
        self.assertTrue(response.data["is_staff"])
        response = self.client.get(f"/api/files/?user_id={self.other.pk}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_deleting_user_removes_physical_files(self):
        item = StoredFile.objects.create(
            owner=self.other,
            file=SimpleUploadedFile("obsolete.txt", b"remove me"),
            original_name="obsolete.txt",
            size=9,
        )
        stored_path = Path(item.file.path)
        self.assertTrue(stored_path.exists())
        self.other.delete()
        self.assertFalse(stored_path.exists())

