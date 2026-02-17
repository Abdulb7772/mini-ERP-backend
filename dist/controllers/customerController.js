"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCustomer = exports.updateCustomer = exports.createCustomer = exports.getCustomer = exports.getCustomers = void 0;
const Customer_1 = __importDefault(require("../models/Customer"));
const errorHandler_1 = require("../middlewares/errorHandler");
const getCustomers = async (req, res, next) => {
    try {
        const customers = await Customer_1.default.find({ isActive: true }).sort({
            createdAt: -1,
        });
        res.status(200).json({
            status: "success",
            data: customers,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getCustomers = getCustomers;
const getCustomer = async (req, res, next) => {
    try {
        const { id } = req.params;
        const customer = await Customer_1.default.findById(id);
        if (!customer) {
            throw new errorHandler_1.AppError("Customer not found", 404);
        }
        res.status(200).json({
            status: "success",
            data: customer,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getCustomer = getCustomer;
const createCustomer = async (req, res, next) => {
    try {
        const { name, email, phone, address } = req.body;
        const customer = await Customer_1.default.create({
            name,
            email,
            phone,
            address,
        });
        res.status(201).json({
            status: "success",
            data: customer,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createCustomer = createCustomer;
const updateCustomer = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, email, phone, address } = req.body;
        const customer = await Customer_1.default.findById(id);
        if (!customer) {
            throw new errorHandler_1.AppError("Customer not found", 404);
        }
        if (name)
            customer.name = name;
        if (email !== undefined)
            customer.email = email;
        if (phone)
            customer.phone = phone;
        if (address !== undefined)
            customer.address = address;
        await customer.save();
        res.status(200).json({
            status: "success",
            data: customer,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateCustomer = updateCustomer;
const deleteCustomer = async (req, res, next) => {
    try {
        const { id } = req.params;
        const customer = await Customer_1.default.findById(id);
        if (!customer) {
            throw new errorHandler_1.AppError("Customer not found", 404);
        }
        await Customer_1.default.findByIdAndDelete(id);
        res.status(200).json({
            status: "success",
            message: "Customer deleted successfully",
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteCustomer = deleteCustomer;
