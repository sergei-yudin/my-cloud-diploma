from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import StoredFile, User


@admin.register(User)
class CloudUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (("My Cloud", {"fields": ("full_name", "storage_path")}),)
    add_fieldsets = UserAdmin.add_fieldsets + (("My Cloud", {"fields": ("full_name", "email")}),)


admin.site.register(StoredFile)

