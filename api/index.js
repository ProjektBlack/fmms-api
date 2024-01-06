
import { MongoClient } from 'mongodb';
const { ObjectId } = require('mongodb');
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

//opt for just using env variable in vercel
const mongoURI = process.env.MONGODB_URI || "mongodb+srv://admin:tangpuzzy@fmms-gms.gufmo1l.mongodb.net/gms-db";

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

const updateRecord = async (collectionName, req, res) => {
    try {
        await connectToDatabase();
        const collection = client.db().collection(collectionName);

        // Extract documentId from the URL and update from the request body
        const documentId = req.params.documentId;
        const update = req.body;

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

async function getSingleRecord(collectionName, req, res) {
    try {
        await connectToDatabase();
        const collection = client.db().collection(collectionName);

        // Extract documentId from the URL
        const documentId = req.params.documentId;

        const result = await collection.findOne({ _id: new ObjectId(documentId) });

        if (result) {
            res.status(200).json({
                message: "Record fetched successfully",
                data: result
            });
        } else {
            res.status(404).json({
                message: "Record not found",
            });
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: "Error fetching record.",
            error: error.message,
        });
    } finally {
        if (client) {
            await client.close();
            console.log("MongoDB connection closed");
        }
    }
}

const deleteTruckRecord = async (collectionName, req, res) => {
    try {
        await connectToDatabase();
        const collection = client.db().collection(collectionName);

        const documentId = new ObjectId(req.params.documentId);

        // delete trips that are associated with the truck
        await client.db().collection('trips').deleteMany({ truck: documentId });

        // delete all associated expenses
        const truck = await collection.findOne({ _id: documentId });

        // issue with if expenses are empty, it cannot delete
        if (truck && truck.expenses) {
            const { yearlyExpenses, monthlyExpenses } = truck.expenses;

            for (let yearlyExpense of yearlyExpenses) {
                await client.db().collection('yearlyExpenses').deleteMany({ _id: new ObjectId(yearlyExpense) });
            }

            for (let monthlyExpense of monthlyExpenses) {
                await client.db().collection('monthlyExpenses').deleteMany({ _id: new ObjectId(monthlyExpense) });
            }
        }
        // finally, delete the truck
        await collection.deleteOne({ _id: documentId });

        // confirm deletion
        res.status(200).json({ message: "Truck and its associated trips and expenses deleted successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const deleteTripRecord = async (collectionName, req, res) => {
    try {
        await connectToDatabase();
        const tripsCollection = client.db().collection(collectionName);
        const trucksCollection = client.db().collection('trucks');

        const documentId = new ObjectId(req.params.documentId);

        const trip = await tripsCollection.findOne({ _id: documentId });
        if (!trip) {
            return res.status(404).json({ message: "Trip not found" });
        }

        const truck = await trucksCollection.findOne({ _id: trip.truck });
        if (truck) {
            const index = truck.trips.indexOf(documentId.toString());
            if (index > -1) {
                truck.trips.splice(index, 1);
                await trucksCollection.updateOne({ _id: truck._id }, { $set: { trips: truck.trips } });
            }
        }

        await tripsCollection.deleteOne({ _id: documentId });

        res.status(200).json({ message: "Trip deleted and removed from references." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error." });
    }
};

const deleteMonthlyExpenses = async (collectionName, req, res) => {
    try {
        await connectToDatabase();
        const expensesCollection = client.db().collection(collectionName);
        const trucksCollection = client.db().collection('trucks');

        const documentId = new ObjectId(req.params.documentId);

        const expense = await expensesCollection.findOne({ _id: documentId });
        if (!expense) {
            return res.status(404).json({ message: "Monthly expense not found." });
        }

        const truck = await trucksCollection.findOne({ "expenses.monthlyExpenses": documentId.toString() });
        if (truck) {
            const index = truck.expenses.monthlyExpenses.indexOf(documentId.toString());
            if (index > -1) {
                truck.expenses.monthlyExpenses.splice(index, 1);
                await trucksCollection.updateOne({ _id: truck._id }, { $set: { "expenses.monthlyExpenses": truck.expenses.monthlyExpenses } });
            }
        }

        await expensesCollection.deleteOne({ _id: documentId });

        res.status(200).json({ message: "Expense deleted and removed from references." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error." });
    }
}

const deleteYearlyExpenses = async (collectionName, req, res) => {
    try {
        await connectToDatabase();
        const expensesCollection = client.db().collection(collectionName);
        const trucksCollection = client.db().collection('trucks');

        const documentId = new ObjectId(req.params.documentId);

        const expense = await expensesCollection.findOne({ _id: documentId });
        if (!expense) {
            return res.status(404).json({ message: "Expense not found." });
        }

        const truck = await trucksCollection.findOne({ "expenses.yearlyExpenses": documentId.toString() });
        if (truck) {
            const index = truck.expenses.yearlyExpenses.indexOf(documentId.toString());
            if (index > -1) {
                truck.expenses.yearlyExpenses.splice(index, 1);
                await trucksCollection.updateOne({ _id: truck._id }, { $set: { "expenses.yearlyExpenses": truck.expenses.yearlyExpenses } });
            }
        }

        await expensesCollection.deleteOne({ _id: documentId });

        res.status(200).json({ message: "Expense deleted successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
}
// Default handler
export default async function handler(req, res) {
    if (req.method === 'GET') {
        if (req.url.startsWith('/trucks/?id=')) {
            const documentId = req.url.split('=')[1];
            req.params = { documentId };
            await getSingleRecord('trucks', req, res);
        } else if (req.url.startsWith('/trips/?id=')) {
            const documentId = req.url.split('=')[1];
            req.params = { documentId };
            await getSingleRecord('trips', req, res);
        } else if (req.url.startsWith('/expenses/monthly/?id=')) {
            const documentId = req.url.split('=')[1];
            req.params = { documentId };
            await getSingleRecord('monthlyexpenses', req, res);
        } else if (req.url.startsWith('/expenses/yearly/?id=')) {
            const documentId = req.url.split('=')[1];
            req.params = { documentId };
            await getSingleRecord('yearlyexpenses', req, res);
        } else if (req.url === '/trucks') {
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
            const documentId = req.url.split('=')[1];
            req.params = { documentId };
            await updateRecord('trucks', req, res);
        } else if (req.url.startsWith('/trips/?id=')) {
            const documentId = req.url.split('=')[1];
            req.params = { documentId };
            await updateRecord('trips', req, res);
        } else if (req.url.startsWith('/expenses/monthly/?id=')) {
            const documentId = req.url.split('=')[1];
            req.params = { documentId };
            await updateRecord('monthlyexpenses', req, res);
        } else if (req.url.startsWith('/expenses/yearly/?id=')) {
            const documentId = req.url.split('=')[1];
            req.params = { documentId };
            await updateRecord('yearlyexpenses', req, res);
        } else {
            res.status(404).json({ message: 'Not Found' });
        }
    } else if (req.method == 'DELETE') {
        if (req.url.startsWith('/trucks/?id=')) {
            const documentId = req.url.split('=')[1];
            req.params = { documentId };
            await deleteTruckRecord('trucks', req, res);
        } else if (req.url.startsWith('/trips/?id=')) {
            const documentId = req.url.split('=')[1];
            req.params = { documentId };
            await deleteTripRecord('trips', req, res);
        } else if (req.url.startsWith('/expenses/monthly/?id=')) {
            const documentId = req.url.split('=')[1];
            req.params = { documentId };
            await deleteMonthlyExpenses('monthlyexpenses', req, res);
        } else if (req.url.startsWith('/expenses/yearly/?id=')) {
            const documentId = req.url.split('=')[1];
            req.params = { documentId };
            await deleteYearlyExpenses('yearlyexpenses', req, res);
        } else {
            res.status(404).json({ message: 'Not Found' });
        }
    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
}
