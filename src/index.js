import dotenv from 'dotenv';
import connectDB from './db/db.js';

dotenv.config({path: './env'});
import { app } from './app.js';

const port = process.env.PORT || 3000;

connectDB()
.then(() => {
    app.listen(port, () => {
        console.log(`✅ Server is running on port ${port}`);
    });
})
.catch((err) => {
    console.log("MONGO db connection failed !!!", err);
}); 
