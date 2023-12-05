import { MongoClient } from "mongodb";

const mongoURI = process.env.MONGODB_URI || "mongodb+srv://admin:tangpuzzy@fmms-gms.gufmo1l.mongodb.net/test";

//reuseable function to establish a new connection since this is serverless
export async function connectToDatabase() {
    const client = new MongoClient(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    return client;
}

//creating a new record
export async function createRecord(model, req, res) {
    try {
        const newRecord = { ...req.body };
        const record = await model.create(newRecord);
        res.status(201).send(record);
        await client.close();
    } catch (error) {
        console.error(error.message);
        res.status(500).send({ message: error.message });
    }
}

//get all records in a collection
export async function getAllRecords(model, res) {
    try {
        const client = await connectToDatabase();
        const database = await model.find({});
        res.status(200).json({
            count: database.length,
            data: database,
        });
        await client.close();
    } catch (error) {
        console.error(error.message);
        res.status(500).send({ message: error.message });
    }
}

//get a record by ID
export async function getSingleRecord(model, req, res) {
    try {
        const client = await connectToDatabase();
        const { id } = req.params;
        const record = await model.findById(id);
        if (!record) {
            res.status(404).json({ message: `${model.modelName} not found.` });
        }
        res.status(200).json(record);
        await client.close();
    } catch (error) {
        console.error(error.message);
        res.status(500).send({ message: error.message });
    }
}

//update a record by ID
export async function updateRecord(model, req, res) {
    try {
        const client = await connectToDatabase();
        const { id } = req.params;
        const result = await model.findByIdAndUpdate(id, req.body);
        if (!result) {
            res.status(404).json({ message: `${model.modelName} not found.` });
        }
        res.status(200).send({ message: `${model.modelName} updated successfully.` });
        await client.close();
    } catch (error) {
        console.error(error.message);
        res.status(500).send({ message: error.message });
    }
}

export default {
    connectToDatabase,
    createRecord,
    getAllRecords,
    getSingleRecord,
    updateRecord
};