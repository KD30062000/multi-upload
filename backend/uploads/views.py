from django.shortcuts import render

# Create your views here.
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.db import transaction
from .models import FileUpload, UploadSession
from .serializers import FileUploadSerializer, UploadSessionSerializer
from .services import S3Service

@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def upload_files(request):
    """Handle multiple file uploads"""
    files = request.FILES.getlist('files')
    
    if not files:
        return Response({'error': 'No files provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Create upload session
    session = UploadSession.objects.create(total_files=len(files))
    s3_service = S3Service()
    
    uploaded_files = []
    failed_files = []
    
    for file in files:
        try:
            with transaction.atomic():
                # Create file record
                file_upload = FileUpload.objects.create(
                    session=session,
                    original_name=file.name,
                    file_size=file.size,
                    content_type=file.content_type,
                    s3_key='',
                    s3_url='',
                    upload_status='uploading'
                )
                
                # Upload to S3
                result = s3_service.upload_file(file, file.name, file.content_type)
                
                if result['success']:
                    file_upload.s3_key = result['s3_key']
                    file_upload.s3_url = result['s3_url']
                    file_upload.upload_status = 'completed'
                    file_upload.save()
                    uploaded_files.append(file_upload)
                    
                    # Update session
                    session.completed_files += 1
                    session.save()
                else:
                    file_upload.upload_status = 'failed'
                    file_upload.error_message = result['error']
                    file_upload.save()
                    failed_files.append(file_upload)
                    
        except Exception as e:
            failed_files.append({
                'name': file.name,
                'error': str(e)
            })
    
    # Update session status
    if failed_files:
        session.status = 'failed' if not uploaded_files else 'completed'
    else:
        session.status = 'completed'
    session.save()
    
    return Response({
        'session_id': session.id,
        'uploaded_files': FileUploadSerializer(uploaded_files, many=True).data,
        'failed_files': len(failed_files),
        'total_files': len(files),
        'success_count': len(uploaded_files)
    })

@api_view(['GET'])
def get_upload_session(request, session_id):
    """Get upload session details"""
    try:
        session = UploadSession.objects.get(id=session_id)
        serializer = UploadSessionSerializer(session)
        return Response(serializer.data)
    except UploadSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
def list_uploads(request):
    """List all upload sessions"""
    sessions = UploadSession.objects.all().order_by('-created_at')
    serializer = UploadSessionSerializer(sessions, many=True)
    return Response(serializer.data)

@api_view(['DELETE'])
def delete_file(request, file_id):
    """Delete a file from S3 and database"""
    try:
        file_upload = FileUpload.objects.get(id=file_id)
        s3_service = S3Service()
        
        # Delete from S3
        try:
            s3_service.s3_client.delete_object(
                Bucket=s3_service.bucket_name,
                Key=file_upload.s3_key
            )
        except Exception as e:
            pass  # Continue even if S3 deletion fails
        
        # Delete from database
        file_upload.delete()
        
        return Response({'message': 'File deleted successfully'})
        
    except FileUpload.DoesNotExist:
        return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)