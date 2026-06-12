# Supabase Storage Setup Guide for Personnel Images

## Overview

The batch image upload feature requires a Supabase storage bucket named `personnel-images` to be configured and publicly accessible.

## Setup Steps

### 1. Create the Storage Bucket

1. Log in to your **Supabase Dashboard**
2. Navigate to **Storage** in the left sidebar
3. Click **Create a new bucket**
4. Name it: `personnel-images`
5. **IMPORTANT**: Make it **Public** (toggle the visibility option)
6. Click **Create bucket**

### 2. Verify Bucket Configuration

After creation, verify:
- ✓ Bucket name is `personnel-images`
- ✓ Visibility is set to **Public**
- ✓ Access Level shows as "Public"

### 3. Set Bucket Policies (if needed)

If you have custom RLS (Row Level Security) policies, ensure:

```sql
-- Allow public read access
CREATE POLICY "Public Read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'personnel-images');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated Upload" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'personnel-images' AND
    auth.role() = 'authenticated'
  );
```

### 4. Verify Environment Variables

Check your `.env.local` or `.env` file contains:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

These must match your Supabase project credentials.

## Testing the Setup

1. Go to Admin Panel → Personnel → Manage Personnel
2. Click "Batch Image Upload"
3. Select a test image
4. Assign it to a personnel member
5. Click "Upload X Images"

### Expected Result
- Image uploads successfully
- Status shows ✓ (green checkmark)
- Edit Records button appears

### If You See Error: "bucket not found"

This means:
1. **Bucket doesn't exist** - Create it following steps above
2. **Bucket is private** - Make it public
3. **Wrong bucket name** - Verify it's exactly `personnel-images`
4. **Supabase not configured** - Check environment variables

## File Structure in Storage

After successful uploads, files are organized as:

```
personnel-images/
├── personnel/
│   ├── {personnel-id-1}/
│   │   ├── photo1.jpg-1234567890
│   │   └── photo2.jpg-1234567891
│   ├── {personnel-id-2}/
│   │   └── portrait.jpg-1234567892
```

## Image URLs

Once uploaded, images are accessible at:

```
https://{your-project}.supabase.co/storage/v1/object/public/personnel-images/personnel/{personnel-id}/{filename}
```

## Troubleshooting

### Images Upload But Can't Be Viewed
- **Cause**: Bucket is not public
- **Fix**: Go to Supabase Storage, select bucket, toggle to Public

### Can't Upload Any Images
- **Cause**: Bucket policies blocking uploads
- **Fix**: Check RLS policies or make bucket public

### "Supabase configuration missing" Error
- **Cause**: Environment variables not set
- **Fix**: Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local

### Images Show 404 After Upload
- **Cause**: Bucket or file deleted after upload
- **Fix**: Re-upload, ensure bucket stays public

## Production Notes

For production deployments:

1. **Security**: Consider keeping bucket private and using signed URLs if needed
2. **Backup**: Regularly backup personnel images from storage
3. **Monitoring**: Track storage usage to prevent exceeding quotas
4. **Performance**: Use CDN caching headers (set to 3600 seconds by default)

## Support

If you continue to experience issues:
1. Verify bucket exists: Check Supabase Storage dashboard
2. Check permissions: Ensure bucket is Public
3. Check environment: Verify VITE_ variables are set
4. Review Supabase logs: Check Project Settings → Logs

For more Supabase Storage docs: https://supabase.com/docs/guides/storage
