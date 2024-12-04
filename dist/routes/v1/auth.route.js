"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("passport"));
const auth_controllers_1 = require("../../controllers/auth.controllers");
const router = (0, express_1.Router)();
router.get("/status", auth_controllers_1.AuthController.status);
router.post("/register", passport_1.default.authenticate("local-register"), auth_controllers_1.AuthController.register);
router.post("/register-as-company", auth_controllers_1.AuthController.verifyCompanyToken, passport_1.default.authenticate("local-register"), auth_controllers_1.AuthController.registerAsCompany);
router.post("/register-as-maintainer", auth_controllers_1.AuthController.verifyRepositoryToken, passport_1.default.authenticate("github"));
router.post("/login", passport_1.default.authenticate("local-login"), auth_controllers_1.AuthController.login);
router.get("/github", passport_1.default.authenticate("github"));
router.get("/redirect/github", passport_1.default.authenticate("github"), auth_controllers_1.AuthController.registerForRepository);
router.post("/logout", auth_controllers_1.AuthController.logout);
router.get("/company-user-invite-info", auth_controllers_1.AuthController.getCompanyUserInviteInfo);
router.get("/repository-user-invite-info", auth_controllers_1.AuthController.getRepositoryUserInviteInfo);
exports.default = router;