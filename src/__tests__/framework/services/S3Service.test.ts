import {
  HeadObjectCommand,
  ListBucketsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Service } from '../../../framework/services/S3Service';

const s3Mock = mockClient(S3Client);

describe('S3Service', () => {
  let service: S3Service;
  let s3Client: S3Client;

  beforeEach(() => {
    s3Mock.reset();
    s3Client = new S3Client({ region: 'us-east-1' });
    service = new S3Service(s3Client);
  });

  describe('findBucket', () => {
    it('should find existing bucket successfully', async () => {
      s3Mock.on(ListBucketsCommand).resolves({
        Buckets: [
          {
            Name: 'test-bucket',
            CreationDate: new Date(),
          },
          {
            Name: 'another-bucket',
            CreationDate: new Date(),
          },
        ],
      });

      await expect(service.findBucket('test-bucket')).resolves.not.toThrow();
    });

    it('should throw error when bucket does not exist', async () => {
      s3Mock.on(ListBucketsCommand).resolves({
        Buckets: [
          {
            Name: 'other-bucket',
            CreationDate: new Date(),
          },
        ],
      });

      await expect(service.findBucket('non-existent-bucket')).rejects.toThrow(
        'Bucket non-existent-bucket not found'
      );
    });

    it('should throw error when bucket list is empty', async () => {
      s3Mock.on(ListBucketsCommand).resolves({
        Buckets: [],
      });

      await expect(service.findBucket('test-bucket')).rejects.toThrow(
        'Bucket test-bucket not found'
      );
    });

    it('should throw error when bucket list is undefined', async () => {
      s3Mock.on(ListBucketsCommand).resolves({});

      await expect(service.findBucket('test-bucket')).rejects.toThrow(
        'Bucket test-bucket not found'
      );
    });

    it('should handle AWS SDK errors', async () => {
      s3Mock.on(ListBucketsCommand).rejects(new Error('AWS access denied'));

      await expect(service.findBucket('test-bucket')).rejects.toThrow(
        'AWS access denied'
      );
    });

    it('should handle case-sensitive bucket names', async () => {
      s3Mock.on(ListBucketsCommand).resolves({
        Buckets: [
          {
            Name: 'Test-Bucket',
            CreationDate: new Date(),
          },
        ],
      });

      await expect(service.findBucket('test-bucket')).rejects.toThrow(
        'Bucket test-bucket not found'
      );
      await expect(service.findBucket('Test-Bucket')).resolves.not.toThrow();
    });
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      s3Mock.on(PutObjectCommand).resolves({});

      await expect(
        service.uploadFile('test-bucket', 'test.txt', 'content')
      ).resolves.not.toThrow();
    });

    it('should handle upload errors', async () => {
      s3Mock.on(PutObjectCommand).rejects(new Error('Upload failed'));

      await expect(
        service.uploadFile('test-bucket', 'test.txt', 'content')
      ).rejects.toThrow('Upload failed');
    });

    it('should upload with different content types', async () => {
      s3Mock.on(PutObjectCommand).resolves({});

      await expect(
        service.uploadFile('test-bucket', 'data.json', '{"test":"data"}')
      ).resolves.not.toThrow();
    });

    it('should upload empty content', async () => {
      s3Mock.on(PutObjectCommand).resolves({});

      await expect(
        service.uploadFile('test-bucket', 'empty.txt', '')
      ).resolves.not.toThrow();
    });
  });

  describe('checkFileExists', () => {
    it('should return true when file exists', async () => {
      s3Mock.on(HeadObjectCommand).resolves({
        ContentLength: 100,
        LastModified: new Date(),
      });

      const result = await service.checkFileExists('test-bucket', 'test.txt');

      expect(result).toBe(true);
    });

    it('should return false when file does not exist (NoSuchKey)', async () => {
      const noSuchKeyError = new Error('The specified key does not exist.');
      (noSuchKeyError as any).name = 'NoSuchKey';
      s3Mock.on(HeadObjectCommand).rejects(noSuchKeyError);

      const result = await service.checkFileExists(
        'test-bucket',
        'missing.txt'
      );

      expect(result).toBe(false);
    });

    it('should return false when file does not exist (NotFound)', async () => {
      const notFoundError = new Error('Not Found');
      (notFoundError as any).name = 'NotFound';
      s3Mock.on(HeadObjectCommand).rejects(notFoundError);

      const result = await service.checkFileExists(
        'test-bucket',
        'missing.txt'
      );

      expect(result).toBe(false);
    });

    it('should throw error for access denied', async () => {
      const accessError = new Error('Access denied');
      (accessError as any).name = 'AccessDenied';
      s3Mock.on(HeadObjectCommand).rejects(accessError);

      await expect(
        service.checkFileExists('test-bucket', 'test.txt')
      ).rejects.toThrow('Access denied');
    });

    it('should throw error for bucket not found', async () => {
      const bucketError = new Error('The specified bucket does not exist');
      (bucketError as any).name = 'NoSuchBucket';
      s3Mock.on(HeadObjectCommand).rejects(bucketError);

      await expect(
        service.checkFileExists('nonexistent-bucket', 'test.txt')
      ).rejects.toThrow('The specified bucket does not exist');
    });

    it('should handle different bucket and file combinations', async () => {
      s3Mock.on(HeadObjectCommand).resolves({});

      const result1 = await service.checkFileExists('bucket-1', 'file1.txt');
      const result2 = await service.checkFileExists('bucket-2', 'file2.txt');

      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });

    it('should throw error for unknown errors', async () => {
      const unknownError = new Error('Unknown AWS error');
      (unknownError as any).name = 'UnknownError';
      s3Mock.on(HeadObjectCommand).rejects(unknownError);

      await expect(
        service.checkFileExists('test-bucket', 'test.txt')
      ).rejects.toThrow('Unknown AWS error');
    });
  });
});
