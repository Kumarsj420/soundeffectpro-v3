import mongoose from "mongoose";

// Use a global cache so warm Lambda instances reuse the connection
const cache: { promise: Promise<typeof mongoose> | null } = global.__mongoose_cache__ ??
    (global.__mongoose_cache__ = { promise: null });

export async function connectDB() {
    // Already connected — reuse
    if (mongoose.connection.readyState === 1) return;

    // Connection in progress — wait for it
    if (cache.promise) {
        await cache.promise;
        return;
    }

    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI environment variable is not set");
    }

    cache.promise = mongoose.connect(process.env.MONGO_URI, {
        dbName: "soundfx",
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 10000,
    });

    await cache.promise;
}

declare global {
    // eslint-disable-next-line no-var
    var __mongoose_cache__: { promise: Promise<typeof mongoose> | null };
}
