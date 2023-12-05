
import { MongoClient } from "mongodb";
//opt for just using env variable in vercel
const mongoURI = process.env.MONGODB_URI || "mongodb+srv://admin:tangpuzzy@fmms-gms.gufmo1l.mongodb.net/test";

let client;

//crucial as this is serverless
async function connectToDatabase() {
    client = new MongoClient(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    console.log("Connected to MongoDB.");
    return client;
}
//method for getting all data in a collection
const getAllData = async (collectionName, req, res) => {
    try {
        await connectToDatabase();
        const collection = client.db().collection(collectionName);
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
        if (client) {
            await client.close();
            console.log("MongoDB connection closed");
        }
    }
};

//create a new record
const createRecord = async (collectionName, req, res) => {
    try {
        await connectToDatabase();
        const collection = client.db().collection(collectionName);

        // Extract data from the request body
        const newData = req.body;

        // Validate if newData is an object and not empty
        if (typeof newData === 'object' && Object.keys(newData).length > 0) {
            const result = await collection.insertOne(newData);

            res.status(201).json({
                message: "Record created successfully",
                data: result // The newly created record
            });
        } else {
            res.status(400).json({
                message: "Invalid data provided in the request body.",
            });
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: "Error creating record.",
            error: error.message,
        });
    } finally {
        if (client) {
            await client.close();
            console.log("MongoDB connection closed");
        }
    }
};

//update a record
const updateRecord = async (collectionName, req, res) => {
    try {
        await connectToDatabase();
        const collection = client.db().collection(collectionName);

        // Extract data from the request body
        const newData = req.body;

        // Extract document ID from the URL parameters
        const documentId = req.params.id;

        // Validate if newData is an object and not empty
        if (typeof newData === 'object' && Object.keys(newData).length > 0) {
            const result = await collection.updateOne({ _id: ObjectId(documentId) }, { $set: newData });

            res.status(200).json({
                message: "Record updated successfully.",
                data: result // The newly created record
            });
        } else {
            res.status(400).json({
                message: "Invalid data provided in the request body.",
            });
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: "Error updating record.",
            error: error.message,
        });
    } finally {
        if (client) {
            await client.close();
            console.log("MongoDB connection closed");
        }
    }
};

// Default handler
export default async function handler(req, res) {
    if (req.method === 'GET') {
        if (req.url === '/trucks') {
            await getAllData('trucks', req, res);
        } else if (req.url === '/trips') {
            await getAllData('trips', req, res);
        } else if (req.url === '/expenses/monthly') {
            await getAllData('monthlyexpenses', req, res);
        } else if (req.url === '/expenses/yearly') {
            await getAllData('yearlyexpenses', req, res);
        } else {
            res.status(404).json({ message: 'Not Found' });
        }
    } else if (req.method == 'POST') {
        if (req.url === '/trucks') {
            await createRecord('trucks', req, res);
        } else if (req.url === '/trips') {
            await createRecord('trips', req, res);
        } else if (req.url === '/expenses/monthly') {
            await createRecord('monthlyexpenses', req, res);
        } else if (req.url === '/expenses/yearly') {
            await createRecord('yearlyexpenses', req, res);
        } else {
            res.status(404).json({ message: 'Not Found' });
        }
    } else if (req.method == 'PUT') {
        if (req.url.startsWith('/trucks/')) {
            // Extract document ID from the URL
            const documentId = req.url.split('/').pop();
            req.params = { id: documentId };
            await updateRecord('trucks', req, res);
        } else if (req.url.startsWith('/trips/')) {
            const documentId = req.url.split('/').pop();
            req.params = { id: documentId };
            await updateRecord('trips', req, res);
        } else if (req.url.startsWith('/expenses/monthly/')) {
            const documentId = req.url.split('/').pop();
            req.params = { id: documentId };
            await updateRecord('monthlyexpenses', req, res);
        } else if (req.url.startsWith('/expenses/yearly/')) {
            const documentId = req.url.split('/').pop();
            req.params = { id: documentId };
            await updateRecord('yearlyexpenses', req, res);
        } else {
            res.status(404).json({ message: 'Not Found' });
        }
    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
}
