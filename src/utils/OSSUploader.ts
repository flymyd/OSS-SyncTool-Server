import axios from 'axios';
import { getOSSConfig } from './OSSConfig';
import * as FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';

export class OSSUploader {
  static async uploadFile(
    filePath: string,
    fileContent: Buffer,
    env: 'dev' | 'test' | 'prod'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const ossConfig = getOSSConfig(env);
      const formData = new FormData();
      
      // 使用原始文件路径，不添加 v2 前缀
      const ossFilePath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
      const fileName = path.basename(ossFilePath);
      
      // 使用 form-data 的正确方式添加字段
      formData.append('key', ossFilePath);
      formData.append('policy', ossConfig.policyBase64);
      formData.append('OSSAccessKeyId', ossConfig.accessid);
      formData.append('signature', ossConfig.signature);
      formData.append('success_action_status', '200');
      formData.append('file', fileContent, {
        filename: fileName,
        contentType: 'application/octet-stream',
      });

      console.log('Uploading file:', {
        path: ossFilePath,
        host: ossConfig.host,
        size: fileContent.length
      });

      const response = await axios.post(ossConfig.host, formData, {
        headers: {
          ...formData.getHeaders(),
          'Content-Length': formData.getLengthSync(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      if (response.status === 200) {
        console.log('Upload successful:', ossFilePath);
        return { success: true };
      } else {
        console.error('Upload failed:', response.status, response.statusText);
        return {
          success: false,
          error: `Upload failed with status ${response.status}`
        };
      }
    } catch (error) {
      console.error('Upload error:', error.message, error.stack);
      return {
        success: false,
        error: error.message || '上传失败'
      };
    }
  }
} 