"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleTeamStatus = exports.deleteTeam = exports.updateTeam = exports.createTeam = exports.getTeam = exports.getTeams = void 0;
const Team_1 = __importDefault(require("../models/Team"));
const User_1 = __importDefault(require("../models/User"));
const errorHandler_1 = require("../middlewares/errorHandler");
const getTeams = async (req, res, next) => {
    try {
        const teams = await Team_1.default.find().sort({ createdAt: -1 });
        // Get members for each team
        const teamsWithMembers = await Promise.all(teams.map(async (team) => {
            const members = await User_1.default.find({ teams: team._id }).select("name email role");
            return {
                ...team.toObject(),
                members,
            };
        }));
        res.status(200).json({
            status: "success",
            data: teamsWithMembers,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getTeams = getTeams;
const getTeam = async (req, res, next) => {
    try {
        const { id } = req.params;
        const team = await Team_1.default.findById(id);
        if (!team) {
            throw new errorHandler_1.AppError("Team not found", 404);
        }
        // Get team members
        const members = await User_1.default.find({ teams: id }).select("-password");
        res.status(200).json({
            status: "success",
            data: {
                team,
                members,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getTeam = getTeam;
const createTeam = async (req, res, next) => {
    try {
        const { name, description, members } = req.body;
        const existingTeam = await Team_1.default.findOne({ name });
        if (existingTeam) {
            throw new errorHandler_1.AppError("Team name already exists", 400);
        }
        const team = await Team_1.default.create({
            name,
            description,
        });
        // Add team to users if members are provided
        if (members && members.length > 0) {
            await User_1.default.updateMany({ _id: { $in: members } }, { $addToSet: { teams: team._id } });
        }
        res.status(201).json({
            status: "success",
            message: "Team created successfully",
            data: team,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createTeam = createTeam;
const updateTeam = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, members } = req.body;
        const team = await Team_1.default.findById(id);
        if (!team) {
            throw new errorHandler_1.AppError("Team not found", 404);
        }
        // Check if name already exists (excluding current team)
        if (name && name !== team.name) {
            const existingTeam = await Team_1.default.findOne({ name });
            if (existingTeam) {
                throw new errorHandler_1.AppError("Team name already exists", 400);
            }
        }
        team.name = name || team.name;
        team.description = description !== undefined ? description : team.description;
        await team.save();
        // Update team members if provided
        if (members !== undefined) {
            // Remove team from all users first
            await User_1.default.updateMany({ teams: id }, { $pull: { teams: id } });
            // Add team to selected users
            if (members.length > 0) {
                await User_1.default.updateMany({ _id: { $in: members } }, { $addToSet: { teams: team._id } });
            }
        }
        res.status(200).json({
            status: "success",
            message: "Team updated successfully",
            data: team,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateTeam = updateTeam;
const deleteTeam = async (req, res, next) => {
    try {
        const { id } = req.params;
        const team = await Team_1.default.findById(id);
        if (!team) {
            throw new errorHandler_1.AppError("Team not found", 404);
        }
        // Remove team from all users
        await User_1.default.updateMany({ teams: id }, { $pull: { teams: id } });
        await Team_1.default.findByIdAndDelete(id);
        res.status(200).json({
            status: "success",
            message: "Team deleted successfully",
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteTeam = deleteTeam;
const toggleTeamStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const team = await Team_1.default.findById(id);
        if (!team) {
            throw new errorHandler_1.AppError("Team not found", 404);
        }
        team.isActive = !team.isActive;
        await team.save();
        res.status(200).json({
            status: "success",
            message: `Team ${team.isActive ? "activated" : "deactivated"} successfully`,
            data: team,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.toggleTeamStatus = toggleTeamStatus;
