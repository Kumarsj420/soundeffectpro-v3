import mongoose from "mongoose";

let isConnected = false;

export async function connectDB() {
    if (isConnected) return;

    const conn = await mongoose.connect(process.env.MONGO_URI!, {
        dbName: "soundfx",
        maxPoolSize: 20,
        minPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 10000,
    });
    isConnected = conn.connections[0].readyState === 1;
}
