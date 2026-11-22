from django.urls import path

from . import views

urlpatterns = [
    path("csrf/", views.csrf),
    path("auth/register/", views.register),
    path("auth/login/", views.sign_in),
    path("auth/logout/", views.sign_out),
    path("auth/me/", views.me),
    path("users/", views.UsersView.as_view()),
    path("users/<int:pk>/", views.UserDetailView.as_view()),
    path("files/", views.FilesView.as_view()),
    path("files/<int:pk>/", views.FileDetailView.as_view()),
    path("files/<int:pk>/download/", views.download),
    path("files/<int:pk>/share/", views.share),
    path("public/<uuid:token>/", views.public_download),
]

