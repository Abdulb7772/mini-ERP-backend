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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const query = { isActive: true };
    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      status: "success",
      data: customers,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
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
