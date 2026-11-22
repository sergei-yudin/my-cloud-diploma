import os

from django.core.management.base import BaseCommand

from cloud.models import User


class Command(BaseCommand):
    help = "Creates the initial administrator from environment variables"

    def handle(self, *args, **options):
        username = os.getenv("ADMIN_USERNAME", "admin")
        email = os.getenv("ADMIN_EMAIL", "admin@example.com")
        password = os.getenv("ADMIN_PASSWORD", "Admin123!")
        user, created = User.objects.get_or_create(
            username=username,
            defaults={"email": email, "full_name": "Администратор", "is_staff": True, "is_superuser": True},
        )
        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f"Administrator {username} created"))
        else:
            self.stdout.write(f"Administrator {username} already exists")

