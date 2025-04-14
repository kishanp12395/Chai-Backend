import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

import mongoose from "mongoose";
import jwt from "jsonwebtoken";



const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}


export const registerUser = asyncHandler(async (req, res, next) => {

    // get user details from frontend
   // validate user details
   // check if user already exists
   // check for images, or avatar
   // upload to cloudinary, check avatar
   // create user object - create entry in db
   // remove password and refresh token from response
   // check for user creation
   // return response



   const {userName, email, fullName, password} = req.body;
//    console.log(userName,email,fullName,passowrd);

   if([userName, email, fullName, password].some((field) => field?.trim() === "")){
    throw new ApiError(400, "All fields are required");
   }

   const existedUser =  await User.findOne({
    $or: [{email}, {userName}]
   })

   if(existedUser){
    throw new ApiError(409, "User already exists");
   }
    //console.log(req.files);
   

    const avatarLocalPath = req.files?.avatar ? req.files.avatar[0].path : null;
    const coverImageLocalPath = req.files?.coverImage ? req.files.coverImage[0].path : null;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required");
    }

    // upload to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(500, "Failed to upload avatar");
    }
    

    const user = new User({
        userName: userName.toLowerCase(),
        email,
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || null,
        password
    });

    await user.save();

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if(!createdUser){
        throw new ApiError(500, "Failed to create user");
    }

    return res.status(201).json(new ApiResponse(200, createdUser,"User created successfully"));

    

});




export const loginUser = asyncHandler(async (req, res, next) => {
    // get user details from frontend
    // validate user details
    // check if user exists
    // check if password is correct
    // generate access token and refresh token
    // send cookie 
    // return response

    const {email, password, userName} = req.body;

    if(!userName && !email){
        throw new ApiError(400, "All fields are required");
    }

    const user = await User.findOne({
        $or: [{email}, {userName}]
    });

    if(!user){
        throw new ApiError(404, "User not found");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid credentials");
    }

    const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");


    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {accessToken, user: loggedInUser, refreshToken}, "User logged in successfully"));

});





export const logoutUser = asyncHandler(async (req, res) => {
    if (!req.user) {
        throw new ApiError(401, "Unauthorized: User not found");
    }

    await User.findByIdAndUpdate(
        req.user._id, 
        { $set: { refreshToken: null } },  // Set refreshToken to null instead of 1
        { new: true }
    );

    const options = {
        httpOnly: true,
        secure: true,
        sameSite: "None"
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});




export const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if(!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized: No refresh token provided");
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id)
        if(!user) {
            throw new ApiError(401, "Invalid refresh token");
        }
    
        if(user.refreshToken !== incomingRefreshToken) {
            throw new ApiError(401, "Invalid refresh token or expired");
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id);
    
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(new ApiResponse(200, {accessToken, newRefreshToken}, "Access token refreshed successfully"));
        
    } catch (error) {
        throw new ApiError(401, "Invalid refresh token or expired");
    }

});




export const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {oldPassword, newPassword} = req.body;

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if(!isPasswordCorrect) {
        throw new ApiError(401, "Invalid Password");
    }
    user.password = newPassword;
    await user.save({validateBeforeSave: false});

    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
});


export const getCurrentUser = asyncHandler(async (req, res) => {      
    return res.status(200).json(new ApiResponse(200, req.user, "User fetched successfully"));
})



const updateAccountDetails = asyncHandler(async (req, res) => {
    const {fullName, email} = req.body;
    if(!fullName || !email) {
        throw new ApiError(400, "All fields are required");
    }
    const user = User.findByIdAndUpdate(
        req.user._id, 
        {
            $set: {
                fullName,
                email,
            }
        }, 
        {new: true}
    ).select("-password");

    return res.status(200).json(new ApiResponse(200, user, "User updated successfully"));
})



export const updateAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if(!avatar.url){
        throw new ApiError(500, "Failed to upload avatar");
    }

   const user =  await User.findByIdAndUpdate(
        req.user?._id, 
        {
            $set: {
                avatar: avatar.url
            }
        }, 
        {new: true}
    ).select("-password");
    return res.status(200).json(new ApiResponse(200, user, "Avatar updated successfully"));
})

export const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover Image is required");
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!coverImage.url){
        throw new ApiError(500, "Failed to upload coverImage");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id, 
        {
            $set: {
                coverImage: coverImage.url
            }
        }, 
        {new: true}
    ).select("-password");

    return res.status(200).json(new ApiResponse(200, user, "Cover image updated successfully"));
})

