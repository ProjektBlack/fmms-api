// trucks.js

// Import common functions
import common from "../common.js";
// Import model from models
import { Truck } from "../models/models.js";

const { createRecord, getAllRecords, getSingleRecord, updateRecord } = common;

export default async function handler(req, res) {
    if (req.method === 'POST') {
        // Route for creating a new truck
        await createRecord(Truck, req, res);
    } else if (req.method === 'GET') {
        // Route for getting all trucks
        await getAllRecords(Truck, res);
    } else if (req.method === 'PUT') {
        // Route for updating a truck by ID
        await updateRecord(Truck, req, res);
    } else {
        // Handle other methods or unsupported paths
        res.status(404).json({ message: 'Not Found' });
    }
}

// Route for getting a single truck by ID
export async function getTruckById(req, res) {
    await getSingleRecord(Truck, req, res);
}

// Additional routes for specific HTTP methods or paths can be added here if needed
