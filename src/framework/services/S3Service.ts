import {
  HeadObjectCommand,
  ListBucketsCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';

export class S3Service {
  private s3Client: S3Client;

  constructor(s3Client: S3Client) {
    this.s3Client = s3Client;
  }

  async findBucket(bucketName: string): Promise<void> {
    const command = new ListBucketsCommand({});
    const response = await this.s3Client.send(command);
    const bucket = response.Buckets?.find(
      (bucket) => bucket.Name === bucketName
    );
    if (!bucket) {
      throw new Error(`Bucket ${bucketName} not found`);
    }
  }

  async uploadFile(
    bucketName: string,
    fileName: string,
    content: string
  ): Promise<void> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: content,
      })
    );
  }

  async checkFileExists(
    bucketName: string,
    fileName: string
  ): Promise<boolean> {
    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: bucketName,
          Key: fileName,
        })
      );
      return true;
    } catch (_error) {
      return false;
    }
  }
}
