import { ref, listAll, getDownloadURL, getMetadata } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * Lists all files in a Storage folder path and gets their download URLs.
 * Returns array of { name, url, fullPath, contentType, isPdf, isImage }
 */
export async function getStorageFiles(folderPath) {
  try {
    const folderRef = ref(storage, folderPath);
    const result = await listAll(folderRef);
    
    if (!result.items || result.items.length === 0) {
      return [];
    }

    const files = await Promise.all(
      result.items.map(async (itemRef) => {
        try {
          const url = await getDownloadURL(itemRef);
          let metadata = null;
          try {
            metadata = await getMetadata(itemRef);
          } catch {
            // metadata might fail depending on rules/CORS, default to filename checking
          }

          const name = itemRef.name;
          const lowerName = name.toLowerCase();
          const contentType = metadata?.contentType || '';
          
          const isPdf = contentType.includes('pdf') || lowerName.endsWith('.pdf');
          const isImage = contentType.includes('image') || 
            lowerName.endsWith('.jpg') || 
            lowerName.endsWith('.jpeg') || 
            lowerName.endsWith('.png') || 
            lowerName.endsWith('.webp') || 
            lowerName.endsWith('.gif');

          return {
            name,
            url,
            fullPath: itemRef.fullPath,
            contentType,
            isPdf,
            isImage
          };
        } catch (err) {
          console.warn(`Failed to fetch URL for ${itemRef.fullPath}:`, err);
          return null;
        }
      })
    );

    return files.filter(Boolean);
  } catch (err) {
    console.warn(`Error listing files for path "${folderPath}":`, err.message);
    return [];
  }
}
