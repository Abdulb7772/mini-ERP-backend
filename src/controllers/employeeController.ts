import { Request, Response } from "express";
import Employee from "../models/Employee";

// Get all employees (admin - includes inactive)
export const getAllEmployees = async (req: Request, res: Response) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
    res.status(200).json(employees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ message: "Failed to fetch employees" });
  }
};

// Get active employees (client - only active)
export const getActiveEmployees = async (req: Request, res: Response) => {
  try {
    const employees = await Employee.find({ status: "active" }).sort({ createdAt: -1 });
    res.status(200).json(employees);
  } catch (error) {
    console.error("Error fetching active employees:", error);
    res.status(500).json({ message: "Failed to fetch employees" });
  }
};

// Get single employee by ID
export const getEmployeeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const employee = await Employee.findById(id);
    
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    
    res.status(200).json(employee);
  } catch (error) {
    console.error("Error fetching employee:", error);
    res.status(500).json({ message: "Failed to fetch employee" });
  }
};

// Create new employee
export const createEmployee = async (req: Request, res: Response) => {
  try {
    const { name, position, yearsOfExperience, imageUrl, bio } = req.body;

    if (!name || !position || yearsOfExperience === undefined) {
      return res.status(400).json({ message: "Name, position, and years of experience are required" });
    }

    const employee = new Employee({
      name,
      position,
      yearsOfExperience,
      imageUrl: imageUrl || "",
      bio: bio || "",
      status: "active",
    });

    const savedEmployee = await employee.save();
    res.status(201).json(savedEmployee);
  } catch (error) {
    console.error("Error creating employee:", error);
    res.status(500).json({ message: "Failed to create employee" });
  }
};

// Update employee
export const updateEmployee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, position, yearsOfExperience, imageUrl, bio, status } = req.body;

    const employee = await Employee.findByIdAndUpdate(
      id,
      {
        name,
        position,
        yearsOfExperience,
        imageUrl,
        bio,
        status,
      },
      { new: true, runValidators: true }
    );

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.status(200).json(employee);
  } catch (error) {
    console.error("Error updating employee:", error);
    res.status(500).json({ message: "Failed to update employee" });
  }
};

// Toggle employee status (active/inactive)
export const toggleEmployeeStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const employee = await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    employee.status = employee.status === "active" ? "inactive" : "active";
    await employee.save();

    res.status(200).json(employee);
  } catch (error) {
    console.error("Error toggling employee status:", error);
    res.status(500).json({ message: "Failed to toggle employee status" });
  }
};

// Delete employee
export const deleteEmployee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const employee = await Employee.findByIdAndDelete(id);

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.status(200).json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error("Error deleting employee:", error);
    res.status(500).json({ message: "Failed to delete employee" });
  }
};
