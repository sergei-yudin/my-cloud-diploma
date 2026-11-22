from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import TemplateView

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/", include("cloud.urls")),
]

urlpatterns += [re_path(r"^(?!api/|django-admin/|static/).*$", TemplateView.as_view(template_name="index.html"))]

