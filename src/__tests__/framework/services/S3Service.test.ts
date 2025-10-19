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
    it('should call ListBuckets command', async () => {
      s3Mock.on(ListBucketsCommand).resolves({
        Buckets: [
          {
            Name: 'test-bucket',
            CreationDate: new Date(),
          },
        ],
      });

      await expect(service.findBucket('test-bucket')).resolves.not.toThrow();
    });

    it('should handle empty bucket list', async () => {
      s3Mock.on(ListBucketsCommand).resolves({
        Buckets: [],
      });

      // Note: Current implementation doesn't validate if bucket exists
      // It just checks if ListBuckets succeeds
      await expect(service.findBucket('non-existent')).resolves.not.toThrow();
    });

    it('should handle AWS SDK errors', async () => {
      s3Mock.on(ListBucketsCommand).rejects(new Error('AWS error'));

      await expect(service.findBucket('test-bucket')).rejects.toThrow();
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

    it('should return false when file does not exist', async () => {
      s3Mock.on(HeadObjectCommand).rejects(new Error('NoSuchKey'));

      const result = await service.checkFileExists(
        'test-bucket',
        'missing.txt'
      );

      expect(result).toBe(false);
    });

    it('should return false on other errors', async () => {
      s3Mock.on(HeadObjectCommand).rejects(new Error('Access denied'));

      const result = await service.checkFileExists('test-bucket', 'test.txt');

      expect(result).toBe(false);
    });

    it('should handle different bucket and file combinations', async () => {
      s3Mock.on(HeadObjectCommand).resolves({});

      const result1 = await service.checkFileExists('bucket-1', 'file1.txt');
      const result2 = await service.checkFileExists('bucket-2', 'file2.txt');

      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });
  });
});
