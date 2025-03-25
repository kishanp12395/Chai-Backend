import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";



const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Failed to generate tokens");
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

    if([email, password, userName].some((field) => field?.trim() === "")){
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

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");


    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .cookie("accesToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {accessToken, user: loggedInUser, refreshToken}, "User logged in successfully"));

});


export const logoutUser = asyncHandler(async (req, res, next) => {
  
   User.findByIdAndUpdate(
    req.user._id, 
    {$set: {refreshToken:undefined}},
    {new: true},
);

return res
.status(200)    
.clearCookie("accessToken")
.clearCookie("refreshToken")
.json(new ApiResponse(200, null, "User logged out successfully"));

});