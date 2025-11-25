import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const username = formData.get('username') as string;
    const oldFilename = formData.get('oldFilename') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const fileType = file.type.toLowerCase();
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json({ 
        error: 'Only JPG and PNG image files are allowed for profile photos.' 
      }, { status: 400 });
    }

    // Validate file extension
    const fileName = file.name.toLowerCase();
    const extension = fileName.substring(fileName.lastIndexOf('.'));
    if (!['.jpg', '.jpeg', '.png'].includes(extension)) {
      return NextResponse.json({ 
        error: 'Only JPG and PNG image files are allowed for profile photos.' 
      }, { status: 400 });
    }

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create profile_pics directory if it doesn't exist
    const profilePicsDir = join(process.cwd(), 'public', 'profile_pics');
    if (!existsSync(profilePicsDir)) {
      await mkdir(profilePicsDir, { recursive: true });
    }

    // Generate filename: username_HHMMDDMMYYYY.ext
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear());
    const timestampdate = `${hours}${minutes}${day}${month}${year}`;
    
    // Clean username (remove special characters, spaces)
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filename = `${cleanUsername}_${timestampdate}${extension}`;
    const filepath = join(profilePicsDir, filename);

    // Delete old file if it exists and is different
    if (oldFilename && oldFilename !== filename) {
      const oldFilePath = join(profilePicsDir, oldFilename);
      if (existsSync(oldFilePath)) {
        try {
          await unlink(oldFilePath);
        } catch (error) {
          console.error('Error deleting old file:', error);
          // Continue even if deletion fails
        }
      }
    }

    // Write file to public/profile_pics
    await writeFile(filepath, buffer);

    // Return the path relative to public folder
    return NextResponse.json({ 
      path: `profile_pics/${filename}`,
      filename: filename
    });
  } catch (error: any) {
    console.error('Error uploading profile picture:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to upload file' 
    }, { status: 500 });
  }
}






