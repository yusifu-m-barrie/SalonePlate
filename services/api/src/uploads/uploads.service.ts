import { BadRequestException, Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

@Injectable()
export class UploadsService {
  readonly menuUploadDir: string;

  constructor() {
    this.menuUploadDir = join(process.cwd(), 'uploads', 'menu');
    if (!existsSync(this.menuUploadDir)) {
      mkdirSync(this.menuUploadDir, { recursive: true });
    }
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
    }
  }

  getUploadSignature() {
    const timestamp = Math.round(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder: 'saloneplate/menu' },
      process.env.CLOUDINARY_API_SECRET || '',
    );
    return {
      timestamp,
      signature,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder: 'saloneplate/menu',
    };
  }

  async saveMenuImage(file: Express.Multer.File) {
    if (!file?.path && !file?.buffer) {
      throw new BadRequestException('No image file provided');
    }

    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_SECRET) {
      const uploadSource = file.path || `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      const result = await cloudinary.uploader.upload(uploadSource, {
        folder: 'saloneplate/menu',
        resource_type: 'image',
      });
      return { url: result.secure_url };
    }

    const filename = file.filename;
    if (!filename) {
      throw new BadRequestException('Could not store image');
    }
    // Store relative paths in DB; API interceptor resolves to API_PUBLIC_URL on read.
    return { url: `/uploads/menu/${filename}` };
  }
}
