import { collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Deletes all documents across all Firestore collections to start completely fresh.
 */
export async function wipeAllFirestoreData() {
  const collectionsToWipe = ['users', 'experiences', 'bookings', 'reviews', 'notifications', 'settings'];
  const summary = {};

  for (const colName of collectionsToWipe) {
    try {
      const colRef = collection(db, colName);
      const snapshot = await getDocs(colRef);
      let count = 0;

      for (const docSnap of snapshot.docs) {
        // If experiences collection, check and wipe itineraryFeedback sub-collection first
        if (colName === 'experiences') {
          try {
            const subRef = collection(db, 'experiences', docSnap.id, 'itineraryFeedback');
            const subSnap = await getDocs(subRef);
            for (const subDoc of subSnap.docs) {
              await deleteDoc(subDoc.ref);
            }
          } catch (subErr) {
            console.warn(`Error deleting sub-collection for experience ${docSnap.id}:`, subErr);
          }
        }

        await deleteDoc(docSnap.ref);
        count++;
      }

      summary[colName] = count;
    } catch (err) {
      console.error(`Error wiping collection "${colName}":`, err);
      summary[colName] = `Error: ${err.message}`;
    }
  }

  return summary;
}
