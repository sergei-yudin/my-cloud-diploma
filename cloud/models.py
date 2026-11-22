import uuid
from pathlib import Path

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver


def storage_upload_path(instance, filename):
    suffix = Path(filename).suffix.lower()
    return f"users/{instance.owner_id}/{uuid.uuid4().hex}{suffix}"


class User(AbstractUser):
    full_name = models.CharField(max_length=150)
    storage_path = models.CharField(max_length=255, blank=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        expected = f"users/{self.pk}"
        if self.storage_path != expected:
            type(self).objects.filter(pk=self.pk).update(storage_path=expected)
            self.storage_path = expected


class StoredFile(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="stored_files")
    file = models.FileField(upload_to=storage_upload_path)
    original_name = models.CharField(max_length=255)
    size = models.PositiveBigIntegerField()
    comment = models.TextField(blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    last_downloaded_at = models.DateTimeField(null=True, blank=True)
    share_token = models.UUIDField(null=True, blank=True, unique=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self):
        return self.original_name


@receiver(post_delete, sender=StoredFile)
def delete_stored_file(sender, instance, **kwargs):
    """Remove the physical file after direct or cascading model deletion."""
    if instance.file:
        instance.file.delete(save=False)

