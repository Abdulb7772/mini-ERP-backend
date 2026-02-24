import { Response, NextFunction } from "express";
import Team from "../models/Team";
import User from "../models/User";
import { AppError } from "../middlewares/errorHandler";
import { AuthRequest } from "../middlewares/auth";

export const getTeams = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const teams = await Team.find().sort({ createdAt: -1 });

    // Get members for each team
    const teamsWithMembers = await Promise.all(
      teams.map(async (team) => {
        const members = await User.find({ teams: team._id }).select("name email role");
        return {
          ...team.toObject(),
          members,
        };
      })
    );

    res.status(200).json({
      status: "success",
      data: teamsWithMembers,
    });
  } catch (error) {
    next(error);
  }
};

export const getTeam = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const team = await Team.findById(id);

    if (!team) {
      throw new AppError("Team not found", 404);
    }

    // Get team members
    const members = await User.find({ teams: id }).select("-password");

    res.status(200).json({
      status: "success",
      data: {
        team,
        members,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createTeam = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, description, members } = req.body;

    const existingTeam = await Team.findOne({ name });
    if (existingTeam) {
      throw new AppError("Team name already exists", 400);
    }

    const team = await Team.create({
      name,
      description,
    });

    // Add team to users if members are provided
    if (members && members.length > 0) {
      await User.updateMany(
        { _id: { $in: members } },
        { $addToSet: { teams: team._id } }
      );
    }

    res.status(201).json({
      status: "success",
      message: "Team created successfully",
      data: team,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTeam = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { name, description, members } = req.body;

    const team = await Team.findById(id);
    if (!team) {
      throw new AppError("Team not found", 404);
    }

    // Check if name already exists (excluding current team)
    if (name && name !== team.name) {
      const existingTeam = await Team.findOne({ name });
      if (existingTeam) {
        throw new AppError("Team name already exists", 400);
      }
    }

    team.name = name || team.name;
    team.description = description !== undefined ? description : team.description;
    await team.save();

    // Update team members if provided
    if (members !== undefined) {
      // Remove team from all users first
      await User.updateMany(
        { teams: id },
        { $pull: { teams: id } }
      );
      
      // Add team to selected users
      if (members.length > 0) {
        await User.updateMany(
          { _id: { $in: members } },
          { $addToSet: { teams: team._id } }
        );
      }
    }

    res.status(200).json({
      status: "success",
      message: "Team updated successfully",
      data: team,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTeam = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const team = await Team.findById(id);
    if (!team) {
      throw new AppError("Team not found", 404);
    }

    // Remove team from all users
    await User.updateMany(
      { teams: id },
      { $pull: { teams: id } }
    );

    await Team.findByIdAndDelete(id);

    res.status(200).json({
      status: "success",
      message: "Team deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const toggleTeamStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const team = await Team.findById(id);
    if (!team) {
      throw new AppError("Team not found", 404);
    }

    team.isActive = !team.isActive;
    await team.save();

    res.status(200).json({
      status: "success",
      message: `Team ${team.isActive ? "activated" : "deactivated"} successfully`,
      data: team,
    });
  } catch (error) {
    next(error);
  }
};
