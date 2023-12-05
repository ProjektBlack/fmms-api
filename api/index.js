
import { MongoClient } from 'mongodb';
const { ObjectId } = require('mongodb');
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

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

const loginUser = async (req, res) => {
    try {
        await connectToDatabase();
        const collection = client.db().collection('users'); // Assuming your users are stored in a 'users' collection

        const { username, password } = req.body;
        const user = await collection.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Invalid password' });
        }
        //create token
        const secretKey = process.env.JWT_SECRET || "t@ngPuWuzZy"; // Make sure to set this environment variable
        const token = jwt.sign({ userId: user._id, role: user.role }, secretKey, {
            expiresIn: '2h',
        });
        res.status(200).json({ token });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Error logging in.' });
    } finally {
        if (client) {
            await client.close();
            console.log("MongoDB connection closed");
        }
    }
};

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

//update a record -- change frontend calls to use this
const updateRecord = async (collectionName, req, res) => {
    try {
        await connectToDatabase();
        const collection = client.db().collection(collectionName);

        // Extract data from the request body
        const { documentId, update } = req.body;

        // Validate if update is an object and not empty
        if (typeof update === 'object' && Object.keys(update).length > 0) {
            const result = await collection.findOneAndUpdate(
                { _id: new ObjectId(documentId) },
                { $set: update },
                { returnOriginal: false }
            );

            res.status(200).json({
                message: "Record updated successfully",
                data: result.value // The updated document
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
        } else if (req.url === '/login') {
            await loginUser(req, res);
        } else {
            res.status(404).json({ message: 'Not Found' });
        }
    } else if (req.method == 'PUT') {
        if (req.url.startsWith('/trucks/?id=')) {
            // Extract document ID from the URL
            const documentId = req.url.split('/').pop();
            req.params = { id: documentId };
            await updateRecord('trucks', req, res);
        } else if (req.url.startsWith('/trips/?id=')) {
            const documentId = req.url.split('/').pop();
            req.params = { id: documentId };
            await updateRecord('trips', req, res);
        } else if (req.url.startsWith('/expenses/monthly/?id=')) {
            const documentId = req.url.split('/').pop();
            req.params = { id: documentId };
            await updateRecord('monthlyexpenses', req, res);
        } else if (req.url.startsWith('/expenses/yearly/?id=')) {
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
