'use client';
import { useState, useEffect } from "react";

export default function ShopifyStoreManager() {
  const [form, setForm] = useState({
    storeId: "",
    SHOPIFY_STORE_NAME: "",
    SHOPIFY_API_KEY: "",
    SHOPIFY_API_SECRET: "",
    SHOPIFY_STORE_URL: "",
    SHOPIFY_ADMIN_SESSION: ""
  });

  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    const user = sessionStorage.getItem("user");
    if (user) {
      setUserId(user);
    }
  }, []);

  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchStores = async () => {
    try {
      const res = await fetch(`/api/store-add?userId=${userId}`);
      const data = await res.json();
      setStores(data);
    } catch (error) {
      console.error("Failed to fetch stores", error);
    }
  };

  useEffect(() => {
    if (userId) fetchStores();
  }, [userId]);

  const handleChange = (e : any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e : any) => {
    e.preventDefault();
    if (!form.storeId) return alert("Store ID is required");
    setLoading(true);

    const res = await fetch("/api/store-add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...form }),
    });

    const result = await res.json();
    setLoading(false);

    if (result.success) {
      alert("Store added!");
      setForm({
        storeId: "",
        SHOPIFY_STORE_NAME: "",
        SHOPIFY_API_KEY: "",
        SHOPIFY_API_SECRET: "",
        SHOPIFY_STORE_URL: "",
        SHOPIFY_ADMIN_SESSION: ""
      });
      fetchStores(); // Refresh store list
    } else {
      alert(result.error || "Failed to add store");
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "auto", padding: "2rem" }}>
      <h2>Add Shopify Store</h2>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
        <input name="storeId" value={form.storeId} onChange={handleChange} placeholder="Unique Store ID" required />
        <input name="SHOPIFY_STORE_NAME" value={form.SHOPIFY_STORE_NAME} onChange={handleChange} placeholder="Store Name" required />
        <input name="SHOPIFY_API_KEY" value={form.SHOPIFY_API_KEY} onChange={handleChange} placeholder="API Key" required />
        <input name="SHOPIFY_API_SECRET" value={form.SHOPIFY_API_SECRET} onChange={handleChange} placeholder="API Secret" required />
        <input name="SHOPIFY_STORE_URL" value={form.SHOPIFY_STORE_URL} onChange={handleChange} placeholder="Store URL" required />
        <input name="SHOPIFY_ADMIN_SESSION" value={form.SHOPIFY_ADMIN_SESSION} onChange={handleChange} placeholder="Admin Session" />
        <button type="submit" disabled={loading}>{loading ? "Adding..." : "Add Store"}</button>
      </form>

      <hr style={{ margin: "2rem 0" }} />

      <h2>Connected Stores</h2>
      {stores.length === 0 ? (
        <p>No stores added yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {stores.map((store : any) => (
            <li key={store.id} style={{ padding: "1rem", borderBottom: "1px solid #ccc" }}>
              <strong>{store.SHOPIFY_STORE_NAME}</strong><br />
              <small>URL: {store.SHOPIFY_STORE_URL}</small><br />
              <small>Store ID: {store.id}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
