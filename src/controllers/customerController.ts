import { Response, NextFunction } from "express";
import Customer from "../models/Customer";
import { AppError } from "../middlewares/errorHandler";
import { AuthRequest } from "../middlewares/auth";

export const getCustomers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const customers = await Customer.find({ isActive: true }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      status: "success",
      data: customers,
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findById(id);

    if (!customer) {
      throw new AppError("Customer not found", 404);
    }

    res.status(200).json({
      status: "success",
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, phone, address } = req.body;

    const customer = await Customer.create({
      name,
      email,
      phone,
      address,
    });

    res.status(201).json({
      status: "success",
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address } = req.body;

    const customer = await Customer.findById(id);
    if (!customer) {
      throw new AppError("Customer not found", 404);
    }

    if (name) customer.name = name;
    if (email !== undefined) customer.email = email;
    if (phone) customer.phone = phone;
    if (address !== undefined) customer.address = address;

    await customer.save();

    res.status(200).json({
      status: "success",
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findById(id);
    if (!customer) {
      throw new AppError("Customer not found", 404);
    }

    await Customer.findByIdAndDelete(id);

    res.status(200).json({
      status: "success",
      message: "Customer deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
