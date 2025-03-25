import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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