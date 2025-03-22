import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";



const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    console.log(`\n ✅ Connected to MongoDB !! DB HOST : ${connectionInstance.connection.host} \n`);
  } catch (error) {
    console.error(`❌ MongoDB connection error": ${error.message}`);
    process.exit(1);
  }
}


export default connectDB;