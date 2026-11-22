import re

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import StoredFile, User

LOGIN_RE = re.compile(r"^[A-Za-z][A-Za-z0-9]{3,19}$")
PASSWORD_RE = re.compile(r"^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$")


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("username", "full_name", "email", "password")

    def validate_username(self, value):
        if not LOGIN_RE.fullmatch(value):
            raise serializers.ValidationError("Логин: 4–20 латинских букв/цифр, первый символ — буква.")
        return value

    def validate_password(self, value):
        if not PASSWORD_RE.fullmatch(value):
            raise serializers.ValidationError("Пароль: минимум 6 символов, заглавная буква, цифра и спецсимвол.")
        validate_password(value)
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    file_count = serializers.IntegerField(read_only=True, default=0)
    storage_size = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = User
        fields = ("id", "username", "full_name", "email", "is_staff", "storage_path", "file_count", "storage_size")


class StoredFileSerializer(serializers.ModelSerializer):
    share_url = serializers.SerializerMethodField()

    class Meta:
        model = StoredFile
        fields = ("id", "owner", "original_name", "size", "comment", "uploaded_at", "last_downloaded_at", "share_token", "share_url")
        read_only_fields = ("id", "owner", "size", "uploaded_at", "last_downloaded_at", "share_token")

    def get_share_url(self, obj):
        if not obj.share_token:
            return None
        request = self.context.get("request")
        path = f"/api/public/{obj.share_token}/"
        return request.build_absolute_uri(path) if request else path

