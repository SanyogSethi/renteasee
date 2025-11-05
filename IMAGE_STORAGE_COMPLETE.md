# Image Storage - Complete Migration Guide

## ✅ Current Status

All images are now stored in MongoDB instead of the filesystem, solving the ephemeral filesystem issue on Render!

## What's Been Fixed

1. **Property Images** ✅
   - New uploads → MongoDB storage
   - Old path-based images → Migrated to MongoDB stock image
   - Script: `scripts/addStockImagesToProperties.js`

2. **Chat Images** ✅
   - New uploads → MongoDB storage
   - Route updated to use MongoDB
   - Script: `scripts/migrateChatImagesToMongoDB.js`

3. **Error Handling** ✅
   - MongoDB image route has fallback to default image
   - Static file route has fallback to default image
   - Better error messages

## How It Works Now

### Upload Flow:
1. User uploads image → Multer stores in **memory** (buffer)
2. Buffer saved to MongoDB `Image` collection
3. MongoDB returns ObjectId (e.g., `507f1f77bcf86cd799439011`)
4. ObjectId stored in Property/Chat document

### Display Flow:
1. Frontend gets image ID from Property/Chat
2. `getImageUrl()` detects it's an ObjectId
3. Constructs URL: `https://backend.com/api/images/{imageId}`
4. Backend serves from MongoDB OR fallback to default image

## Migration Scripts

### For Properties:
```bash
node scripts/addStockImagesToProperties.js
```
- Finds/creates stock image in MongoDB
- Replaces path-based images with MongoDB images
- Adds stock image to properties without images

### For Chat Images:
```bash
node scripts/migrateChatImagesToMongoDB.js
```
- Finds all chats with path-based image URLs
- Replaces with MongoDB stock image
- Skips messages that already have MongoDB IDs

## Troubleshooting

### Issue: "File not found" errors in logs
**Solution:** These are old path-based images. Run migration scripts to update them.

### Issue: Images not loading
**Check:**
1. Is the image ID a valid MongoDB ObjectId? (24 hex characters)
2. Does the Image document exist in MongoDB?
3. Check Render logs for image serving errors

### Issue: Default image showing instead of actual image
**Possible causes:**
1. Image was deleted from MongoDB
2. Invalid ObjectId
3. Migration script hasn't been run yet

## Next Steps

1. ✅ **Already Done:** Property images migrated
2. ✅ **Already Done:** Chat images using MongoDB
3. ✅ **Already Done:** Error handling with fallbacks
4. ⚠️ **Optional:** Run migration scripts if you see "File not found" errors

## Benefits

✅ **Persistent** - Images survive server restarts/deployments  
✅ **No External Services** - Uses existing MongoDB  
✅ **Automatic Backups** - Included in MongoDB backups  
✅ **Error Handling** - Graceful fallbacks prevent crashes  
✅ **Backward Compatible** - Old path-based images still work (with fallback)  

## Storage Monitoring

- Check MongoDB Atlas dashboard for storage usage
- Free tier: 512MB storage
- Typical image: ~1-5MB
- Capacity: ~100-500 images

Monitor storage and upgrade if needed!

