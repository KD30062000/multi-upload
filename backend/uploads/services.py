# backend/uploads/services.py
import boto3
import uuid
from django.conf import settings
from botocore.exceptions import ClientError
import logging
from django.core.files.storage import default_storage

logger = logging.getLogger(__name__)

class S3Service:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )
        self.bucket_name = settings.AWS_STORAGE_BUCKET_NAME

    def upload_file(self, file_obj, file_name, content_type):
        """Upload file to S3 and return the URL"""
        try:
            # Generate unique key
            file_extension = file_name.split('.')[-1] if '.' in file_name else ''
            s3_key = f"uploads/{uuid.uuid4()}.{file_extension}"
            
            # Upload to S3
            self.s3_client.upload_fileobj(
                file_obj,
                self.bucket_name,
                s3_key,
                ExtraArgs={
                    # 'ACL': 'public-read',
                    'ContentType': content_type,
                    'ContentDisposition': f'inline; filename="{file_name}"'
                }
            )
            
            # Generate URL
            s3_url = f"https://{self.bucket_name}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{s3_key}"
            
            return {
                'success': True,
                's3_key': s3_key,
                's3_url': s3_url
            }
            
        except ClientError as e:
            logger.error(f"S3 upload error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }