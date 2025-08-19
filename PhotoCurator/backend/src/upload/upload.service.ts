import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';

@Injectable()
export class UploadService {
  private s3: AWS.S3;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.s3 = new AWS.S3({
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get('AWS_REGION') || 'us-east-1',
    });
    this.bucketName = this.configService.get('S3_BUCKET_NAME') || 'photo-curator-uploads';
  }

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    folder: string = 'photos',
  ): Promise<{
    key: string;
    url: string;
    bucket: string;
  }> {
    const fileExtension = file.originalname.split('.').pop();
    const key = `${folder}/${userId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;

    const uploadParams: AWS.S3.PutObjectRequest = {
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'private',
      Metadata: {
        originalName: file.originalname,
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
      },
    };

    const result = await this.s3.upload(uploadParams).promise();

    return {
      key,
      url: result.Location,
      bucket: this.bucketName,
    };
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const params = {
      Bucket: this.bucketName,
      Key: key,
      Expires: expiresIn,
    };

    return this.s3.getSignedUrl('getObject', params);
  }

  async deleteFile(key: string): Promise<void> {
    const params = {
      Bucket: this.bucketName,
      Key: key,
    };

    await this.s3.deleteObject(params).promise();
  }

  async generatePresignedUploadUrl(
    userId: string,
    filename: string,
    contentType: string,
    folder: string = 'photos',
  ): Promise<{
    uploadUrl: string;
    key: string;
    fields: any;
  }> {
    const fileExtension = filename.split('.').pop();
    const key = `${folder}/${userId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;

    const params = {
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
      ACL: 'private',
      Expires: 300, // 5 minutes
    };

    const uploadUrl = await this.s3.getSignedUrlPromise('putObject', params);

    return {
      uploadUrl,
      key,
      fields: {
        'Content-Type': contentType,
        'x-amz-acl': 'private',
      },
    };
  }
}