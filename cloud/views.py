import logging
import uuid
from pathlib import Path

from django.contrib.auth import authenticate, login, logout
from django.db.models import Count, Sum
from django.http import FileResponse
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import StoredFile, User
from .permissions import IsAdministrator
from .serializers import RegisterSerializer, StoredFileSerializer, UserSerializer

logger = logging.getLogger(__name__)


def error(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({"error": message}, status=code)


@api_view(["GET"])
@permission_classes([AllowAny])
def csrf(request):
    return Response({"csrfToken": get_token(request)})


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        logger.warning("Registration validation failed: %s", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    user = serializer.save()
    login(request, user)
    logger.info("User registered: id=%s username=%s", user.pk, user.username)
    return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
def sign_in(request):
    user = authenticate(request, username=request.data.get("username"), password=request.data.get("password"))
    if user is None:
        logger.warning("Failed login for username=%s", request.data.get("username"))
        return error("Неверный логин или пароль.", status.HTTP_401_UNAUTHORIZED)
    login(request, user)
    logger.info("User logged in: id=%s", user.pk)
    return Response(UserSerializer(user).data)


@api_view(["POST"])
def sign_out(request):
    logger.info("User logged out: id=%s", request.user.pk)
    logout(request)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
def me(request):
    return Response(UserSerializer(request.user).data)


class UsersView(APIView):
    permission_classes = [IsAdministrator]

    def get(self, request):
        users = User.objects.annotate(file_count=Count("stored_files"), storage_size=Sum("stored_files__size"))
        return Response(UserSerializer(users, many=True).data)


class UserDetailView(APIView):
    permission_classes = [IsAdministrator]

    def patch(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        if user == request.user and request.data.get("is_staff") is False:
            return error("Нельзя снять права администратора у текущего пользователя.")
        if "is_staff" not in request.data:
            return error("Передайте поле is_staff.")
        user.is_staff = bool(request.data["is_staff"])
        user.save(update_fields=["is_staff"])
        logger.info("Admin=%s changed staff flag for user=%s to %s", request.user.pk, user.pk, user.is_staff)
        return Response(UserSerializer(user).data)

    def delete(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        if user == request.user:
            return error("Нельзя удалить текущего пользователя.")
        logger.warning("Admin=%s deletes user=%s", request.user.pk, user.pk)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def resolve_owner(request):
    owner_id = request.query_params.get("user_id") or request.data.get("user_id")
    if owner_id and str(owner_id) != str(request.user.pk):
        if not request.user.is_staff:
            return None
        return get_object_or_404(User, pk=owner_id)
    return request.user


class FilesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        owner = resolve_owner(request)
        if owner is None:
            return error("Нет доступа к хранилищу.", status.HTTP_403_FORBIDDEN)
        files = StoredFile.objects.filter(owner=owner)
        return Response(StoredFileSerializer(files, many=True, context={"request": request}).data)

    def post(self, request):
        owner = resolve_owner(request)
        if owner is None:
            return error("Нет доступа к хранилищу.", status.HTTP_403_FORBIDDEN)
        upload = request.FILES.get("file")
        if not upload:
            return error("Выберите файл.")
        item = StoredFile.objects.create(
            owner=owner,
            file=upload,
            original_name=Path(upload.name).name[:255],
            size=upload.size,
            comment=request.data.get("comment", "")[:2000],
        )
        logger.info("User=%s uploaded file=%s owner=%s size=%s", request.user.pk, item.pk, owner.pk, item.size)
        return Response(StoredFileSerializer(item, context={"request": request}).data, status=status.HTTP_201_CREATED)


def get_accessible_file(request, pk):
    item = get_object_or_404(StoredFile, pk=pk)
    if item.owner_id != request.user.pk and not request.user.is_staff:
        return None
    return item


class FileDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        item = get_accessible_file(request, pk)
        if item is None:
            return error("Нет доступа к файлу.", status.HTTP_403_FORBIDDEN)
        if "original_name" in request.data:
            name = Path(str(request.data["original_name"])).name.strip()
            if not name:
                return error("Имя файла не может быть пустым.")
            item.original_name = name[:255]
        if "comment" in request.data:
            item.comment = str(request.data["comment"])[:2000]
        item.save(update_fields=["original_name", "comment"])
        logger.info("User=%s updated file=%s", request.user.pk, item.pk)
        return Response(StoredFileSerializer(item, context={"request": request}).data)

    def delete(self, request, pk):
        item = get_accessible_file(request, pk)
        if item is None:
            return error("Нет доступа к файлу.", status.HTTP_403_FORBIDDEN)
        logger.warning("User=%s deleted file=%s", request.user.pk, item.pk)
        item.file.delete(save=False)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
def download(request, pk):
    item = get_accessible_file(request, pk)
    if item is None:
        return error("Нет доступа к файлу.", status.HTTP_403_FORBIDDEN)
    item.last_downloaded_at = timezone.now()
    item.save(update_fields=["last_downloaded_at"])
    logger.info("User=%s downloaded file=%s", request.user.pk, item.pk)
    return FileResponse(item.file.open("rb"), as_attachment=True, filename=item.original_name)


@api_view(["POST", "DELETE"])
def share(request, pk):
    item = get_accessible_file(request, pk)
    if item is None:
        return error("Нет доступа к файлу.", status.HTTP_403_FORBIDDEN)
    item.share_token = uuid.uuid4() if request.method == "POST" else None
    item.save(update_fields=["share_token"])
    logger.info("User=%s changed share state for file=%s", request.user.pk, item.pk)
    return Response(StoredFileSerializer(item, context={"request": request}).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def public_download(request, token):
    item = get_object_or_404(StoredFile, share_token=token)
    item.last_downloaded_at = timezone.now()
    item.save(update_fields=["last_downloaded_at"])
    logger.info("Public download file=%s", item.pk)
    return FileResponse(item.file.open("rb"), as_attachment=True, filename=item.original_name)

