import {catchAsyncError} from "../middlewares/catchAsyncError.middleware.js";
import { generateJWTToken } from "../utils/jwtToken.js";
import {User} from "../models/user.model.js";

export const signup = catchAsyncError(async (req,res,next)=> {
    const {fullName, email, password} = req.body;

    if(!fullName || !email || !password){
        return res.status(400).json({
            success: false,
            message: "Please provide complete details.",
        });
    }
    const emailRegex = /^\S+@\S+\.\S+$/;
    if(!emailRegex.test(email)){
        return res.status(400).json({
            success: false,
            message: "Invalid email format.",
        });
    }

    if(password.length < 8){
        return res.status(400).json({
            success: false,
            message: "Password must be at least 8 characters long.",
        });
    }

    const isEmailAlreadyUsed = await User.findOne({email});

    if(isEmailAlreadyUsed){
        return res.status(400).json({
            success: false,
            message: "Email is already registered.",
        })
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
        fullName,
        email,
        password: hashedPassword,
        avatar: {
            public_id: "",
            url: "",
        }
    });

    generateJWTToken(user, "User registered successfully",201,res);
});
export const signin = catchAsyncError(async (req,res,next)=> {
    const {email, password}  = req.body;
    if(!email || !password){
        return res.status(400).json({
            success: false,
            message: "Please provide email ans password.",
        })
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if(!emailRegex.test(email)){
        return res.status(400).json({
            success: false,
            message: "Invalid email format.",
        });
    }

    const user = await User.findOne({email});
    if(!user){
        return res.status(400).json({
            success: false,
            message: "Invalid Credentials.",
        })
    }
    const isPasswwordMatched = await bcrypt.compare(password, user.password);
    if(!isPasswwordMatched){
        return res.status(400).json({
            success: false,
            message: "Invalid Credentials"
        })
    }
    generateJWTToken(user, "user loffed in successfully", 200, res);
});
export const signout = catchAsyncError(async (req,res,next)=> {
    res.status(200).cookie("token","",{
        maxAge: 0,
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV !== "development" ? true : false,
    }).json({
        success: true,
        message: "User logged out successfully.",
        
    })
});
export const getUser = catchAsyncError(async (req,res,next)=> {
    const user = req.user;
    req.status(200).json({
        success: true,
        user,
    })
});
export const updateProfile = catchAsyncError(async (req,res,next)=> {
    const {fullName, email} = req.body;
    if(fullName.trim().length === 0 || email.trim().length === 0){
        return res.status(400).json({
            success: false,
            message: "FullName and Email can't be empty.",
        })
    }
    const avatar = req?.files?.avatar;
    let cloudinaryRessponse = {};

    if(avatar){
        try{
            const oldAvatarPublicId = req.user?.avatar?.public_id;
            if(oldAvatarPublicId && oldAvatarPublicId > 0){
                await cloudinary.uploader.destroy(oldAvatarPublicId);
            }
            cloudinaryRessponse = await cloudinary.uploader.upload(
                avatar.tempFilePath,
                {
                    folder:"CHAT_APP_USERS_AVATARS",
                    transformation: [
                        {width: 300, height: 300, crop: "limit"},
                        {quality: "auto"},
                        {fetch_format: "auto"},
                    ]
                }
            )
        }
        catch(error){
            console.error("cloudinary upload error:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to upload avatar. Please try again later."
            })
        }
    }
    let data = {
        fullName,
        email,
    };

    if(avatar && cloudinaryRessponse?.public_id && cloudinaryRessponse?.secure_url){
        data.avatar = {
            public_id: cloudinaryRessponse.public_id,
            url: cloudinaryRessponse.secure_url
        }
    }
    let user = await User.findByIdAndUpdate(req.user._id,data,{
        new: true,
        runValidators: true,
    })

    res.status(200).json({
        success: true,
        message: "Profile updated successfully.",
        user,
    });
});