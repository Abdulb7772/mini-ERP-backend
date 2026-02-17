"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEmployee = exports.toggleEmployeeStatus = exports.updateEmployee = exports.createEmployee = exports.getEmployeeById = exports.getActiveEmployees = exports.getAllEmployees = void 0;
const Employee_1 = __importDefault(require("../models/Employee"));
// Get all employees (admin - includes inactive)
const getAllEmployees = async (req, res) => {
    try {
        const employees = await Employee_1.default.find().sort({ createdAt: -1 });
        res.status(200).json(employees);
    }
    catch (error) {
        console.error("Error fetching employees:", error);
        res.status(500).json({ message: "Failed to fetch employees" });
    }
};
exports.getAllEmployees = getAllEmployees;
// Get active employees (client - only active)
const getActiveEmployees = async (req, res) => {
    try {
        const employees = await Employee_1.default.find({ status: "active" }).sort({ createdAt: -1 });
        res.status(200).json(employees);
    }
    catch (error) {
        console.error("Error fetching active employees:", error);
        res.status(500).json({ message: "Failed to fetch employees" });
    }
};
exports.getActiveEmployees = getActiveEmployees;
// Get single employee by ID
const getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;
        const employee = await Employee_1.default.findById(id);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }
        res.status(200).json(employee);
    }
    catch (error) {
        console.error("Error fetching employee:", error);
        res.status(500).json({ message: "Failed to fetch employee" });
    }
};
exports.getEmployeeById = getEmployeeById;
// Create new employee
const createEmployee = async (req, res) => {
    try {
        const { name, position, yearsOfExperience, imageUrl, bio } = req.body;
        if (!name || !position || yearsOfExperience === undefined) {
            return res.status(400).json({ message: "Name, position, and years of experience are required" });
        }
        const employee = new Employee_1.default({
            name,
            position,
            yearsOfExperience,
            imageUrl: imageUrl || "",
            bio: bio || "",
            status: "active",
        });
        const savedEmployee = await employee.save();
        res.status(201).json(savedEmployee);
    }
    catch (error) {
        console.error("Error creating employee:", error);
        res.status(500).json({ message: "Failed to create employee" });
    }
};
exports.createEmployee = createEmployee;
// Update employee
const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, position, yearsOfExperience, imageUrl, bio, status } = req.body;
        const employee = await Employee_1.default.findByIdAndUpdate(id, {
            name,
            position,
            yearsOfExperience,
            imageUrl,
            bio,
            status,
        }, { new: true, runValidators: true });
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }
        res.status(200).json(employee);
    }
    catch (error) {
        console.error("Error updating employee:", error);
        res.status(500).json({ message: "Failed to update employee" });
    }
};
exports.updateEmployee = updateEmployee;
// Toggle employee status (active/inactive)
const toggleEmployeeStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const employee = await Employee_1.default.findById(id);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }
        employee.status = employee.status === "active" ? "inactive" : "active";
        await employee.save();
        res.status(200).json(employee);
    }
    catch (error) {
        console.error("Error toggling employee status:", error);
        res.status(500).json({ message: "Failed to toggle employee status" });
    }
};
exports.toggleEmployeeStatus = toggleEmployeeStatus;
// Delete employee
const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const employee = await Employee_1.default.findByIdAndDelete(id);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }
        res.status(200).json({ message: "Employee deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting employee:", error);
        res.status(500).json({ message: "Failed to delete employee" });
    }
};
exports.deleteEmployee = deleteEmployee;
