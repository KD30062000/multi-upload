from rest_framework import serializers
from .models import FileUpload, UploadSession

class FileUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = FileUpload
        fields = ['id', 'original_name', 'file_size', 'content_type', 
                 's3_url', 'upload_status', 'error_message', 'created_at']

class UploadSessionSerializer(serializers.ModelSerializer):
    files = FileUploadSerializer(many=True, read_only=True)
    
    class Meta:
        model = UploadSession
        fields = ['id', 'created_at', 'total_files', 'completed_files', 
                 'status', 'files']