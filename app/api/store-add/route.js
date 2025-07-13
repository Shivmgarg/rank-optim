import { db } from "../../../db/db";
import { doc, setDoc, collection, getDocs, updateDoc, getDoc } from "firebase/firestore";
import { NextResponse } from 'next/server';


export async function POST(request) {
    try {
      const body = await request.json();
      const {
        userId,
        storeId,
        SHOPIFY_STORE_NAME,
        SHOPIFY_API_KEY,
        SHOPIFY_API_SECRET,
        SHOPIFY_STORE_URL,
        SHOPIFY_ADMIN_SESSION,
      } = body;
  
      if (!userId || !storeId) {
        return NextResponse.json({ error: 'Missing userId or storeId' }, { status: 400 });
      }
  
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
  
      if (!userSnap.exists()) {
        return NextResponse.json({ error: 'User does not exist' }, { status: 404 });
      }
  
      const storeData = {
        SHOPIFY_STORE_NAME,
        SHOPIFY_API_KEY,
        SHOPIFY_API_SECRET,
        SHOPIFY_STORE_URL,
        SHOPIFY_ADMIN_SESSION,
        createdAt: new Date().toISOString(),
      };
  
      // Update the `stores.storeId` field inside user document
      await updateDoc(userRef, {
        [`stores.${storeId}`]: storeData
      });
  
      return NextResponse.json({ success: true, message: 'Store added under user' }, { status: 200 });
  
    } catch (error) {
      console.error('Error adding store to user:', error);
      return NextResponse.json({ error: 'Failed to add store to user' }, { status: 500 });
    }
  }


export async function GET(request) {
    // Extract 'userId' from the query string
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      // Missing parameter: return 400 Bad Request with JSON error
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
    try {
      // Fetch Firestore documents
      const storeSnap = await getDocs(collection(db, "users", userId, "stores"));
      const stores = storeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Return the stores data as JSON
      return NextResponse.json(stores, { status: 200 });
    } catch (err) {
      // Error case: return 500 Internal Server Error
      return NextResponse.json({ error: "Failed to fetch stores" }, { status: 500 });
    }
  }