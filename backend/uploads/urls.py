# backend/uploads/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('upload/', views.upload_files, name='upload_files'),
    path('sessions/<uuid:session_id>/', views.get_upload_session, name='get_upload_session'),
    path('sessions/', views.list_uploads, name='list_uploads'),
    path('files/<uuid:file_id>/delete/', views.delete_file, name='delete_file'),
]