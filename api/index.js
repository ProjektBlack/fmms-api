// Import packages
import { MongoClient } from "mongodb";
// MongoDB connection URI
const mongoURI = process.env.MONGODB_URI || "mongodb+srv://admin:tangpuzzy@fmms-gms.gufmo1l.mongodb.net/test";

// Declare client globally
let client;

// Function to establish a new connection
async function connectToDatabase() {
    client = new MongoClient(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    console.log("Connected to MongoDB.");
    return client;
}


// Sample route to handle GET request and fetch data from MongoDB collection
export async function getAllTrucks(req, res) {
    try {
        // Establish a new connection
        await connectToDatabase();

        // Access the MongoDB collection (replace 'exampleCollection' with your actual collection name)
        const collection = client.db().collection('trucks');

        // Fetch data from the collection (replace {} with your query)
        const data = await collection.find({}).toArray();

        res.status(200).json({
            message: "Data fetched successfully",
            data: data,
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: "Error fetching data.",
            error: error.message,
        });
    } finally {
        // Close the MongoDB connection to avoid memory leaks
        if (client) {
            await client.close();
            console.log("MongoDB connection closed");
        }
    }
};

export default getAllTrucks;